import type { StopWithLocation } from '$lib/schemas';
import type { CreateMap, Map, UpdateMap } from '$lib/schemas/map';
import { db } from '$lib/server/db';
import {
	driverMapMemberships,
	drivers,
	maps,
	routes,
	stops
} from '$lib/server/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { depotService } from './depot.service';
import { driverService } from './driver.service';
import { ServiceError } from './errors';
import { locationService } from './location.service';
import { stopService } from './stop.service';

export type MapListStats = {
	stop_count: number;
	driver_count: number;
	routed_count: number;
	total_duration: number | null;
};

export class MapService {
	/**
	 * Resolve depot ID - validates provided depot or falls back to default
	 */
	private async resolveDepotId(
		depotId: string | null | undefined,
		organizationId: string
	): Promise<string | null> {
		if (depotId) {
			await depotService.getDepotById(depotId, organizationId);
			return depotId;
		}
		const defaultDepot = await depotService.getDefaultDepot(organizationId);
		return defaultDepot?.depot.id ?? null;
	}

	/**
	 * Get all maps for an organization
	 */
	async getMaps(organizationId: string) {
		return db
			.select()
			.from(maps)
			.where(eq(maps.organization_id, organizationId))
			.orderBy(desc(maps.created_at));
	}

	/**
	 * Get aggregated stats for all maps in an organization (stop counts, driver counts, routing status, duration).
	 * Used by the map list page to avoid loading full stop/route records.
	 */
	async getMapListStats(
		organizationId: string
	): Promise<Record<string, MapListStats>> {
		const [stopStats, routeDurations] = await Promise.all([
			db
				.select({
					map_id: stops.map_id,
					stop_count: sql<number>`count(*)::int`,
					driver_count: sql<number>`count(distinct ${stops.driver_id}) filter (where ${stops.driver_id} is not null)::int`,
					routed_count: sql<number>`count(*) filter (where ${stops.driver_id} is not null and ${stops.delivery_index} is not null)::int`
				})
				.from(stops)
				.where(eq(stops.organization_id, organizationId))
				.groupBy(stops.map_id),
			db
				.select({
					map_id: routes.map_id,
					total_duration: sql<number>`sum(${routes.duration})::float`
				})
				.from(routes)
				.where(eq(routes.organization_id, organizationId))
				.groupBy(routes.map_id)
		]);

		const durationByMap = new Map(
			routeDurations.map((r) => [r.map_id, r.total_duration])
		);

		const result: Record<string, MapListStats> = {};
		for (const row of stopStats) {
			result[row.map_id] = {
				stop_count: row.stop_count,
				driver_count: row.driver_count,
				routed_count: row.routed_count,
				total_duration: durationByMap.get(row.map_id) ?? null
			};
		}
		return result;
	}

	/**
	 * Get a single map with optional statistics
	 */
	async getMapById(mapId: string, organizationId: string) {
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		return map;
	}

	/**
	 * Create a new map. Can optionally include Stops (without a map_id) which will be
	 * created as well.
	 *
	 * Note: Location creation uses `db` directly (not the transaction), so locations
	 * may persist if the transaction fails. This is acceptable as orphaned locations
	 * don't cause issues and can be cleaned up later if needed.
	 */
	async createMap(
		data: CreateMap,
		organizationId: string,
		userId: string
	): Promise<{ map: Map; stops: StopWithLocation[] | null }> {
		// Use provided depot_id, or fall back to organization's default depot
		const depotId = await this.resolveDepotId(data.depot_id, organizationId);

		// If stops are provided, create locations first (outside transaction)
		// This is needed because locationService uses `db` directly
		let locationIds: string[] = [];
		if (data.stops && data.stops.length > 0) {
			locationIds = await Promise.all(
				data.stops.map(async (stop) => {
					if (stop.location_id) {
						return stop.location_id;
					}
					if (stop.location) {
						const location = await locationService.createLocation(
							stop.location,
							organizationId,
							userId
						);
						return location.id;
					}
					throw ServiceError.validation(
						'Stop must have either location_id or location'
					);
				})
			);
		}

		// Create map and stops in transaction
		const map = await db.transaction(async (tx) => {
			const [newMap] = await tx
				.insert(maps)
				.values({
					organization_id: organizationId,
					created_by: userId,
					updated_by: userId,
					title: data.title,
					notes: data.notes ?? null,
					depot_id: depotId
				})
				.returning();

			if (data.stops && data.stops.length > 0) {
				// Insert stops directly using transaction (no map verification needed)
				await tx.insert(stops).values(
					data.stops.map((stop, index) => ({
						organization_id: organizationId,
						created_by: userId,
						updated_by: userId,
						map_id: newMap.id,
						location_id: locationIds[index],
						contact_name: stop.contact_name ?? null,
						contact_phone: stop.contact_phone ?? null,
						notes: stop.notes ?? null,
						driver_id: null,
						delivery_index: null
					}))
				);
			}

			return newMap;
		});

		// Fetch stops with locations after transaction commits
		const createdStops =
			data.stops && data.stops.length > 0
				? await stopService.getStopsByMap(map.id, organizationId)
				: null;

		return { map, stops: createdStops };
	}

	/**
	 * Update a map
	 * If depot_id is being changed, uses setMapDepot to handle route reset logic
	 */
	async updateMap(
		mapId: string,
		data: UpdateMap,
		organizationId: string,
		userId: string
	): Promise<Map> {
		if ('depot_id' in data) {
			await this.setMapDepot(
				mapId,
				data.depot_id ?? null,
				organizationId,
				userId
			);
		}

		const fieldsToUpdate = Object.fromEntries(
			Object.entries(data).filter(([key]) => key !== 'depot_id')
		);

		if (Object.keys(fieldsToUpdate).length === 0) {
			return this.getMapById(mapId, organizationId);
		}

		const [updatedMap] = await db
			.update(maps)
			.set({
				...fieldsToUpdate,
				updated_by: userId
			})
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.returning();

		if (!updatedMap) {
			throw ServiceError.notFound('Map not found');
		}

		return updatedMap;
	}

	/**
	 * Set the depot for a map
	 * If the depot changes and routes exist, resets optimization (deletes routes and clears stop assignments)
	 */
	async setMapDepot(
		mapId: string,
		depotId: string | null,
		organizationId: string,
		userId: string
	): Promise<Map> {
		const map = await this.getMapById(mapId, organizationId);

		if (depotId) {
			await depotService.getDepotById(depotId, organizationId);
		}

		if (map.depot_id === depotId) {
			return map;
		}

		const hasRoutes = await this.mapHasRoutes(mapId);
		if (hasRoutes) {
			await this.resetOptimization(mapId, organizationId, userId);
		}

		const [updatedMap] = await db
			.update(maps)
			.set({
				depot_id: depotId,
				updated_by: userId
			})
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.returning();

		return updatedMap;
	}

	/**
	 * Check if a map has any routes
	 */
	private async mapHasRoutes(mapId: string): Promise<boolean> {
		const [route] = await db
			.select({ id: routes.id })
			.from(routes)
			.where(eq(routes.map_id, mapId))
			.limit(1);

		return route !== undefined;
	}

	/**
	 * Delete a map (cascades to stops and driver memberships)
	 */
	async deleteMap(mapId: string, organizationId: string) {
		await this.getMapById(mapId, organizationId);

		await db
			.delete(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)));

		return { success: true };
	}

	/**
	 * Reset optimization for a map (clear driver assignments)
	 */
	async resetOptimization(
		mapId: string,
		organizationId: string,
		userId: string
	) {
		await this.getMapById(mapId, organizationId);

		// Use transaction to ensure both operations succeed or both fail
		await db.transaction(async (tx) => {
			await tx
				.update(stops)
				.set({
					driver_id: null,
					delivery_index: null,
					updated_by: userId
				})
				.where(eq(stops.map_id, mapId));

			await tx
				.delete(routes)
				.where(
					and(
						eq(routes.map_id, mapId),
						eq(routes.organization_id, organizationId)
					)
				);
		});

		return { success: true };
	}

	// Driver-Map Membership Methods

	/**
	 * Get all drivers assigned to a map
	 */
	async getDriversForMap(mapId: string, organizationId: string) {
		await this.getMapById(mapId, organizationId);

		const results = await db
			.select({
				membership: driverMapMemberships,
				driver: drivers
			})
			.from(driverMapMemberships)
			.innerJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
			.where(
				and(
					eq(driverMapMemberships.map_id, mapId),
					eq(drivers.organization_id, organizationId)
				)
			);

		return results;
	}

	/**
	 * Get all maps a driver is assigned to
	 */
	async getMapsForDriver(driverId: string, organizationId: string) {
		await driverService.getDriverById(driverId, organizationId);

		const results = await db
			.select({
				membership: driverMapMemberships,
				map: maps
			})
			.from(driverMapMemberships)
			.innerJoin(maps, eq(driverMapMemberships.map_id, maps.id))
			.where(
				and(
					eq(driverMapMemberships.driver_id, driverId),
					eq(maps.organization_id, organizationId)
				)
			);

		return results;
	}

	/**
	 * Add a driver to a map
	 */
	async addDriverToMap(
		driverId: string,
		mapId: string,
		organizationId: string
	) {
		await driverService.getDriverById(driverId, organizationId);
		await this.getMapById(mapId, organizationId);

		// Check if membership already exists
		const [existing] = await db
			.select()
			.from(driverMapMemberships)
			.where(
				and(
					eq(driverMapMemberships.driver_id, driverId),
					eq(driverMapMemberships.map_id, mapId)
				)
			)
			.limit(1);

		if (existing) {
			throw ServiceError.conflict('Driver is already assigned to this map');
		}

		const [membership] = await db
			.insert(driverMapMemberships)
			.values({
				organization_id: organizationId,
				driver_id: driverId,
				map_id: mapId
			})
			.returning();

		return membership;
	}

	/**
	 * Remove a driver from a map
	 */
	async removeDriverFromMap(
		driverId: string,
		mapId: string,
		organizationId: string,
		userId: string
	) {
		const driver = await driverService.getDriverById(driverId, organizationId);
		await this.getMapById(mapId, organizationId);

		await db.transaction(async (tx) => {
			// Unassign this driver's stops on this map
			await tx
				.update(stops)
				.set({
					driver_id: null,
					delivery_index: null,
					updated_by: userId
				})
				.where(and(eq(stops.map_id, mapId), eq(stops.driver_id, driverId)));

			// Delete the route for this driver on this map
			await tx
				.delete(routes)
				.where(
					and(
						eq(routes.map_id, mapId),
						eq(routes.driver_id, driverId),
						eq(routes.organization_id, organizationId)
					)
				);

			// Delete the membership
			const [deleted] = await tx
				.delete(driverMapMemberships)
				.where(
					and(
						eq(driverMapMemberships.driver_id, driverId),
						eq(driverMapMemberships.map_id, mapId)
					)
				)
				.returning();

			if (!deleted) {
				throw ServiceError.notFound('Driver is not assigned to this map');
			}

			// Temp drivers are deleted when removed from their map
			if (driver.temporary) {
				await tx
					.delete(drivers)
					.where(
						and(
							eq(drivers.id, driverId),
							eq(drivers.organization_id, organizationId)
						)
					);
			}
		});

		return { success: true };
	}

	/**
	 * Duplicate a map including all its stops (without driver assignments)
	 */
	async duplicateMap(
		mapId: string,
		organizationId: string,
		userId: string,
		newTitle?: string
	): Promise<Map> {
		const sourceMap = await this.getMapById(mapId, organizationId);

		return db.transaction(async (tx) => {
			// Create new map with copied data
			const [newMap] = await tx
				.insert(maps)
				.values({
					organization_id: organizationId,
					title: newTitle || `${sourceMap.title} (Copy)`,
					notes: sourceMap.notes,
					depot_id: sourceMap.depot_id,
					created_by: userId,
					updated_by: userId
				})
				.returning();

			// Get all stops from source map
			const sourceStops = await stopService.getStopsByMap(
				mapId,
				organizationId
			);

			// Clone stops without driver assignments
			if (sourceStops.length > 0) {
				await tx.insert(stops).values(
					sourceStops.map(({ stop }) => ({
						organization_id: organizationId,
						map_id: newMap.id,
						location_id: stop.location_id,
						driver_id: null,
						delivery_index: null,
						contact_name: stop.contact_name,
						contact_phone: stop.contact_phone,
						notes: stop.notes,
						created_by: userId,
						updated_by: userId
					}))
				);
			}

			return newMap;
		});
	}
}

// Singleton instance
export const mapService = new MapService();
