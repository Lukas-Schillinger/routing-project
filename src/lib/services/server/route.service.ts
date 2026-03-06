import type {
	CreateRoute,
	PublicUser,
	Route,
	RouteWithDetails
} from '$lib/schemas';
import { db } from '$lib/server/db';
import {
	depots,
	drivers,
	locations,
	maps,
	routes
} from '$lib/server/db/schema';
import { mapboxNavigation } from '$lib/services/external/mapbox/navigation';
import type { Coordinate } from '$lib/services/external/mapbox/types';
import { and, eq, sql } from 'drizzle-orm';
import { depotService } from './depot.service';
import { ServiceError } from './errors';
import { stopService } from './stop.service';

export class RouteService {
	async getRouteById(routeId: string, organizationId: string): Promise<Route> {
		const [route] = await db
			.select()
			.from(routes)
			.where(
				and(eq(routes.id, routeId), eq(routes.organization_id, organizationId))
			)
			.limit(1);

		if (!route) {
			throw ServiceError.notFound('Route not found');
		}

		return route;
	}
	async upsertRoute(input: CreateRoute, userId?: string): Promise<Route> {
		// Validate that map, driver, and depot all belong to the organization
		const [mapResult, driverResult, depotResult] = await Promise.all([
			db
				.select()
				.from(maps)
				.where(
					and(
						eq(maps.id, input.map_id),
						eq(maps.organization_id, input.organization_id)
					)
				)
				.limit(1),
			db
				.select()
				.from(drivers)
				.where(
					and(
						eq(drivers.id, input.driver_id),
						eq(drivers.organization_id, input.organization_id)
					)
				)
				.limit(1),
			db
				.select()
				.from(depots)
				.where(
					and(
						eq(depots.id, input.depot_id),
						eq(depots.organization_id, input.organization_id)
					)
				)
				.limit(1)
		]);

		if (!mapResult[0]) {
			throw ServiceError.forbidden('Map does not belong to your organization');
		}
		if (!driverResult[0]) {
			throw ServiceError.forbidden(
				'Driver does not belong to your organization'
			);
		}
		if (!depotResult[0]) {
			throw ServiceError.forbidden(
				'Depot does not belong to your organization'
			);
		}

		const [result] = await this.bulkUpsertRoutesInternal([input], userId);
		return result;
	}

	/**
	 * Bulk upsert routes in a single query using onConflictDoUpdate.
	 * Skips per-row ownership validation — caller must ensure all inputs are valid.
	 * Uses the unique index on (map_id, driver_id).
	 */
	async bulkUpsertRoutesInternal(
		inputs: CreateRoute[],
		userId?: string
	): Promise<Route[]> {
		if (inputs.length === 0) return [];

		return await db
			.insert(routes)
			.values(
				inputs.map((input) => ({
					organization_id: input.organization_id,
					map_id: input.map_id,
					driver_id: input.driver_id,
					depot_id: input.depot_id,
					geometry: input.geometry,
					duration: input.duration?.toString(),
					created_by: userId,
					updated_by: userId
				}))
			)
			.onConflictDoUpdate({
				target: [routes.map_id, routes.driver_id],
				set: {
					geometry: sql`excluded.geometry`,
					duration: sql`excluded.duration`,
					depot_id: sql`excluded.depot_id`,
					updated_at: new Date(),
					updated_by: userId
				}
			})
			.returning();
	}

	async getRoutes(organizationId: string) {
		return await db
			.select()
			.from(routes)
			.where(eq(routes.organization_id, organizationId));
	}

	/**
	 * Get all routes for a map
	 */
	async getRoutesByMap(mapId: string, organizationId: string) {
		return await db
			.select()
			.from(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.organization_id, organizationId)
				)
			);
	}

	/**
	 * Delete all routes for a map
	 */
	async deleteRoutesByMap(
		mapId: string,
		organizationId: string
	): Promise<{ success: true }> {
		await db
			.delete(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.organization_id, organizationId)
				)
			);

		return { success: true };
	}

	/**
	 * Delete a specific route
	 */
	async deleteRoute(
		routeId: string,
		organizationId: string
	): Promise<{ success: true }> {
		await this.getRouteById(routeId, organizationId);

		await db
			.delete(routes)
			.where(
				and(eq(routes.id, routeId), eq(routes.organization_id, organizationId))
			);

		return { success: true };
	}

	/**
	 * Get a route if it's public (belongs to a temporary driver)
	 * Returns null if route doesn't exist or isn't public
	 */
	async getPublicRoute(routeId: string): Promise<Route | null> {
		const [result] = await db
			.select()
			.from(routes)
			.innerJoin(drivers, eq(routes.driver_id, drivers.id))
			.where(and(eq(routes.id, routeId), eq(drivers.temporary, true)))
			.limit(1);

		return result?.routes ?? null;
	}

	/**
	 * Get routes accessible to a user based on their role
	 * - Admin/Member/Viewer: All routes in organization
	 * - Driver: Only routes assigned to their driver record
	 */
	async getRoutesForUser(user: PublicUser): Promise<Route[]> {
		if (user.role === 'driver') {
			return await db
				.select({ routes })
				.from(routes)
				.innerJoin(drivers, eq(routes.driver_id, drivers.id))
				.where(
					and(
						eq(routes.organization_id, user.organization_id),
						eq(drivers.user_id, user.id)
					)
				)
				.then((rows) => rows.map((r) => r.routes));
		}

		// Non-driver roles see all org routes
		return this.getRoutes(user.organization_id);
	}

	/**
	 * Get a route with role-based access check
	 */
	async getRouteByIdForUser(routeId: string, user: PublicUser): Promise<Route> {
		const route = await this.getRouteById(routeId, user.organization_id);

		if (user.role === 'driver') {
			const driver = await this.getDriverForUser(user.id, user.organization_id);
			if (!driver || route.driver_id !== driver.id) {
				throw ServiceError.forbidden('You can only access your own routes');
			}
		}

		return route;
	}

	/**
	 * For driver role: Get the driver record linked to this user
	 * Returns null if user is not linked to a driver
	 */
	async getDriverForUser(
		userId: string,
		organizationId: string
	): Promise<typeof drivers.$inferSelect | null> {
		const [driver] = await db
			.select()
			.from(drivers)
			.where(
				and(
					eq(drivers.user_id, userId),
					eq(drivers.organization_id, organizationId)
				)
			)
			.limit(1);

		return driver ?? null;
	}

	/**
	 * Get route with all related details using a single join query
	 * Returns route, map, driver, depot (with location), and routed stops
	 */
	async getRouteWithDetails(
		routeId: string,
		organizationId: string
	): Promise<RouteWithDetails> {
		const [result] = await db
			.select({
				route: routes,
				map: maps,
				driver: drivers,
				depot: depots,
				location: locations
			})
			.from(routes)
			.innerJoin(maps, eq(routes.map_id, maps.id))
			.innerJoin(drivers, eq(routes.driver_id, drivers.id))
			.innerJoin(depots, eq(routes.depot_id, depots.id))
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(
				and(eq(routes.id, routeId), eq(routes.organization_id, organizationId))
			)
			.limit(1);

		if (!result) {
			throw ServiceError.notFound('Route not found');
		}

		const stops = await stopService.getStopsForRoute(
			result.route.map_id,
			result.route.driver_id,
			organizationId
		);

		return {
			route: result.route,
			map: result.map,
			driver: result.driver,
			depot: { depot: result.depot, location: result.location },
			stops
		};
	}

	/**
	 * Get route by map and driver combination
	 */
	async getRouteByMapAndDriver(
		mapId: string,
		driverId: string,
		organizationId: string
	): Promise<Route | null> {
		const [route] = await db
			.select()
			.from(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.driver_id, driverId),
					eq(routes.organization_id, organizationId)
				)
			)
			.limit(1);

		return route ?? null;
	}

	/**
	 * Delete route by map and driver combination
	 */
	async deleteRouteByMapAndDriver(
		mapId: string,
		driverId: string,
		organizationId: string
	): Promise<{ success: true }> {
		await db
			.delete(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.driver_id, driverId),
					eq(routes.organization_id, organizationId)
				)
			);

		return { success: true };
	}

	/**
	 * Recalculate route geometry for a driver after stop changes
	 * - If no route exists but map has a depot, creates a new route
	 * - If no stops remain, deletes the route
	 * - If Mapbox fails, sets geometry to null and throws ServiceError
	 */
	async recalculateRouteForDriver(
		mapId: string,
		driverId: string,
		organizationId: string,
		userId?: string
	): Promise<void> {
		const existingRoute = await this.getRouteByMapAndDriver(
			mapId,
			driverId,
			organizationId
		);

		// Query map directly to avoid circular dependency with mapService
		const [map] = await db
			.select({ depot_id: maps.depot_id })
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.limit(1);

		const depotId = existingRoute?.depot_id ?? map?.depot_id;

		if (!depotId) {
			return;
		}

		const remainingStops = await stopService.getStopsForRoute(
			mapId,
			driverId,
			organizationId
		);

		if (remainingStops.length === 0) {
			if (existingRoute) {
				await this.deleteRouteByMapAndDriver(mapId, driverId, organizationId);
			}
			return;
		}

		const depotWithLocation = await depotService.getDepotById(
			depotId,
			organizationId
		);

		const depotCoord: Coordinate = [
			depotWithLocation.location.lon,
			depotWithLocation.location.lat
		];

		const sortedStops = remainingStops.toSorted(
			(a, b) => (a.stop.delivery_index ?? 0) - (b.stop.delivery_index ?? 0)
		);

		const stopCoords: Coordinate[] = sortedStops.map((s) => [
			s.location.lon,
			s.location.lat
		]);

		const coordinates: Coordinate[] = [depotCoord, ...stopCoords, depotCoord];

		try {
			const directionsResponse =
				await mapboxNavigation.getDirections(coordinates);

			const route = directionsResponse.routes[0];
			if (!route) {
				throw ServiceError.internal('No route returned from Mapbox');
			}

			await this.upsertRoute(
				{
					organization_id: organizationId,
					map_id: mapId,
					driver_id: driverId,
					depot_id: depotId,
					geometry: route.geometry,
					duration: route.duration
				},
				userId
			);
		} catch (error) {
			await this.upsertRoute(
				{
					organization_id: organizationId,
					map_id: mapId,
					driver_id: driverId,
					depot_id: depotId,
					geometry: null,
					duration: undefined
				},
				userId
			);

			throw ServiceError.internal(
				'Error fetching mapbox API to recalculate route geometry',
				{ cause: error }
			);
		}
	}
}

export const routeService = new RouteService();
