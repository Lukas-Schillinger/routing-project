import type {
	CreateRoute,
	Driver,
	Map,
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
import { and, eq } from 'drizzle-orm';
import { depotService } from './depot.service';
import { ServiceError } from './errors';
import { stopService } from './stop.service';

export class RouteService {
	/**
	 * Verify that a route exists and belongs to the given organization
	 */
	async verifyRouteOwnership(
		routeId: string,
		organizationId: string
	): Promise<Route> {
		const [route] = await db
			.select()
			.from(routes)
			.where(eq(routes.id, routeId))
			.limit(1);

		if (!route) {
			throw ServiceError.notFound('Route not found');
		}

		if (route.organization_id !== organizationId) {
			throw ServiceError.forbidden(
				'Route does not belong to your organization'
			);
		}

		return route as Route;
	}
	async upsertRoute(input: CreateRoute, userId?: string): Promise<Route> {
		// Validate that map, driver, and depot all belong to the organization
		const [map] = await db
			.select()
			.from(maps)
			.where(
				and(
					eq(maps.id, input.map_id),
					eq(maps.organization_id, input.organization_id)
				)
			)
			.limit(1);

		if (!map) {
			throw ServiceError.forbidden('Map does not belong to your organization');
		}

		const [driver] = await db
			.select()
			.from(drivers)
			.where(
				and(
					eq(drivers.id, input.driver_id),
					eq(drivers.organization_id, input.organization_id)
				)
			)
			.limit(1);

		if (!driver) {
			throw ServiceError.forbidden(
				'Driver does not belong to your organization'
			);
		}

		const [depot] = await db
			.select()
			.from(depots)
			.where(
				and(
					eq(depots.id, input.depot_id),
					eq(depots.organization_id, input.organization_id)
				)
			)
			.limit(1);

		if (!depot) {
			throw ServiceError.forbidden(
				'Depot does not belong to your organization'
			);
		}

		try {
			// Check if route already exists
			const existing = await db
				.select()
				.from(routes)
				.where(
					and(
						eq(routes.map_id, input.map_id),
						eq(routes.driver_id, input.driver_id)
					)
				)
				.limit(1);

			if (existing.length > 0) {
				// Update existing route
				const [updated] = await db
					.update(routes)
					.set({
						geometry: input.geometry,
						duration: input.duration?.toString(),
						depot_id: input.depot_id,
						updated_at: new Date(),
						updated_by: userId
					})
					.where(eq(routes.id, existing[0].id))
					.returning();

				return updated as Route;
			} else {
				// Insert new route
				const [created] = await db
					.insert(routes)
					.values({
						organization_id: input.organization_id,
						map_id: input.map_id,
						driver_id: input.driver_id,
						depot_id: input.depot_id,
						geometry: input.geometry,
						duration: input.duration?.toString(),
						created_by: userId,
						updated_by: userId
					})
					.returning();

				return created as Route;
			}
		} catch (error) {
			// Re-throw ServiceErrors as-is
			if (error instanceof ServiceError) {
				throw error;
			}

			// Handle specific PostgreSQL errors
			if (error instanceof Error && 'code' in error) {
				const pgError = error as { code: string };
				if (pgError.code === '23503') {
					throw ServiceError.validation('Referenced resource not found', {
						cause: error
					});
				}
				if (pgError.code === '23505') {
					throw ServiceError.conflict(
						'Route already exists for this driver/map combination',
						{ cause: error }
					);
				}
			}

			// Unknown error - let it bubble up (will be caught by handleApiError)
			throw error;
		}
	}

	/**
	 * Bulk upsert routes with transaction wrapping for atomicity
	 */
	async upsertRoutes(inputs: CreateRoute[], userId?: string): Promise<Route[]> {
		return db.transaction(async () => {
			const results: Route[] = [];
			for (const input of inputs) {
				const result = await this.upsertRoute(input, userId);
				results.push(result);
			}
			return results;
		});
	}

	async getRouteById(routeId: string, organizationId: string): Promise<Route> {
		return this.verifyRouteOwnership(routeId, organizationId);
	}

	async getRoutes(organizationId: string) {
		return (await db
			.select()
			.from(routes)
			.where(eq(routes.organization_id, organizationId))) as Route[];
	}

	/**
	 * Get all routes for a map
	 */
	async getRoutesByMap(mapId: string, organizationId: string) {
		return (await db
			.select()
			.from(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.organization_id, organizationId)
				)
			)) as Route[]; // little hack because drizzle can't type the LineString
	}

	/**
	 * Delete all routes for a map
	 */
	async deleteRoutesByMap(mapId: string, organizationId: string) {
		await db
			.delete(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.organization_id, organizationId)
				)
			);
	}

	/**
	 * Delete a specific route
	 */
	async deleteRoute(routeId: string, organizationId: string) {
		await db
			.delete(routes)
			.where(
				and(eq(routes.id, routeId), eq(routes.organization_id, organizationId))
			);
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

		return (result?.routes as Route) ?? null;
	}

	/**
	 * Get routes accessible to a user based on their role
	 * - Admin/Member/Viewer: All routes in organization
	 * - Driver: Only routes assigned to their driver record
	 */
	async getRoutesForUser(user: PublicUser): Promise<Route[]> {
		if (user.role === 'driver') {
			const driver = await this.getDriverForUser(user.id, user.organization_id);
			if (!driver) {
				return []; // Driver user with no linked driver record
			}
			return (await db
				.select()
				.from(routes)
				.where(
					and(
						eq(routes.organization_id, user.organization_id),
						eq(routes.driver_id, driver.id)
					)
				)) as Route[];
		}

		// Non-driver roles see all org routes
		return this.getRoutes(user.organization_id);
	}

	/**
	 * Get a route with role-based access check
	 */
	async getRouteByIdForUser(routeId: string, user: PublicUser): Promise<Route> {
		const route = await this.verifyRouteOwnership(
			routeId,
			user.organization_id
		);

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
			route: result.route as Route,
			map: result.map as Map,
			driver: result.driver as Driver,
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

		return (route as Route) ?? null;
	}

	/**
	 * Delete route by map and driver combination
	 */
	async deleteRouteByMapAndDriver(
		mapId: string,
		driverId: string,
		organizationId: string
	): Promise<void> {
		await db
			.delete(routes)
			.where(
				and(
					eq(routes.map_id, mapId),
					eq(routes.driver_id, driverId),
					eq(routes.organization_id, organizationId)
				)
			);
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
				throw new Error('No route returned from Mapbox');
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
