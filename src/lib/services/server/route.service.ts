import type { CreateRoute, Route } from '$lib/schemas';
import { db } from '$lib/server/db';
import { routes } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export class RouteService {
	/**
	 * Create or update a route for a driver on a map
	 */
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

				return updated;
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

				return created;
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
}

export const routeService = new RouteService();
