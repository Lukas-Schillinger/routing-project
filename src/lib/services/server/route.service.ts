import type { CreateRoute, Driver, Map, PublicUser, Route, RouteWithDetails } from '$lib/schemas';
import { db } from '$lib/server/db';
import { depots, drivers, locations, maps, routes } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';
import { stopService } from './stop.service';

export class RouteService {
	/**
	 * Create or update a route for a driver on a map
	 */
	async verifyRouteOwnership(routeId: string, organizationId: string): Promise<Route> {
		const [route] = await db.select().from(routes).where(eq(routes.id, routeId)).limit(1);

		if (!route) {
			throw ServiceError.notFound('Route not found');
		}

		if (route.organization_id !== organizationId) {
			throw ServiceError.forbidden('Route does not belong to your organization');
		}

		return route as Route;
	}
	async upsertRoute(input: CreateRoute) {
		try {
			// Check if route already exists
			const existing = await db
				.select()
				.from(routes)
				.where(and(eq(routes.map_id, input.map_id), eq(routes.driver_id, input.driver_id)))
				.limit(1);

			if (existing.length > 0) {
				// Update existing route
				const [updated] = await db
					.update(routes)
					.set({
						geometry: input.geometry,
						duration: input.duration?.toString(),
						depot_id: input.depot_id,
						updated_at: new Date()
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
						duration: input.duration?.toString()
					})
					.returning();

				return created as Route;
			}
		} catch (error) {
			console.error('Error upserting route:', error);
			throw new ServiceError('Failed to save route', 'INTERNAL_ERROR', 500);
		}
	}

	/**
	 * Bulk upsert routes (more efficient for multiple routes)
	 */
	async upsertRoutes(inputs: CreateRoute[]) {
		const results = await Promise.all(inputs.map((input) => this.upsertRoute(input)));
		return results;
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
		try {
			return (await db
				.select()
				.from(routes)
				.where(
					and(eq(routes.map_id, mapId), eq(routes.organization_id, organizationId))
				)) as Route[]; // little hack becasuse drizzle can't type the LineString
		} catch (error) {
			console.error('Error fetching routes:', error);
			throw new ServiceError('Failed to fetch routes', 'INTERNAL_ERROR', 500);
		}
	}

	/**
	 * Delete all routes for a map
	 */
	async deleteRoutesByMap(mapId: string, organizationId: string) {
		try {
			await db
				.delete(routes)
				.where(and(eq(routes.map_id, mapId), eq(routes.organization_id, organizationId)));
		} catch (error) {
			console.error('Error deleting routes:', error);
			throw new ServiceError('Failed to delete routes', 'INTERNAL_ERROR', 500);
		}
	}

	/**
	 * Delete a specific route
	 */
	async deleteRoute(routeId: string, organizationId: string) {
		try {
			await db
				.delete(routes)
				.where(and(eq(routes.id, routeId), eq(routes.organization_id, organizationId)));
		} catch (error) {
			console.error('Error deleting route:', error);
			throw new ServiceError('Failed to delete route', 'INTERNAL_ERROR', 500);
		}
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
					and(eq(routes.organization_id, user.organization_id), eq(routes.driver_id, driver.id))
				)) as Route[];
		}

		// Non-driver roles see all org routes
		return this.getRoutes(user.organization_id);
	}

	/**
	 * Get a route with role-based access check
	 */
	async getRouteByIdForUser(routeId: string, user: PublicUser): Promise<Route> {
		const route = await this.verifyRouteOwnership(routeId, user.organization_id);

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
			.where(and(eq(drivers.user_id, userId), eq(drivers.organization_id, organizationId)))
			.limit(1);

		return driver ?? null;
	}

	/**
	 * Get route with all related details using a single join query
	 * Returns route, map, driver, depot (with location), and routed stops
	 */
	async getRouteWithDetails(routeId: string, organizationId: string): Promise<RouteWithDetails> {
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
			.where(and(eq(routes.id, routeId), eq(routes.organization_id, organizationId)))
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
}

export const routeService = new RouteService();
