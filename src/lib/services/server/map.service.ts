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
import { and, eq, sql } from 'drizzle-orm';
import { driverService } from './driver.service';
import { ServiceError } from './errors';
import { stopService } from './stop.service';

export class MapService {
	/**
	 * Verify map ownership
	 */
	private async verifyMapOwnership(mapId: string, organizationId: string) {
		const [map] = await db
			.select()
			.from(maps)
			.where(eq(maps.id, mapId))
			.limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		if (map.organization_id !== organizationId) {
			throw ServiceError.forbidden('Access denied');
		}

		return map;
	}

	/**
	 * Get all maps for an organization
	 */
	async getMaps(organizationId: string) {
		return db
			.select()
			.from(maps)
			.where(eq(maps.organization_id, organizationId))
			.orderBy(sql`${maps.created_at} DESC`);
	}

	/**
	 * Get a single map with optional statistics
	 */
	async getMapById(mapId: string, organizationId: string) {
		const map = await this.verifyMapOwnership(mapId, organizationId);
		return map;
	}

	/**
	 * Create a new map. Can optionally include Stops (without a map_id) which will be
	 * created as well.
	 *
	 * TODO: For full atomicity, stopService.bulkCreateStops should accept a transaction
	 * parameter. Currently, if stop creation fails after map creation, the map is rolled
	 * back but any partial stop/location data may remain.
	 */
	async createMap(
		data: CreateMap,
		organizationId: string,
		userId: string
	): Promise<{ map: Map; stops: StopWithLocation[] | null }> {
		// Wrap in transaction so map is rolled back if stop creation fails
		return await db.transaction(async (tx) => {
			const [map] = await tx
				.insert(maps)
				.values({
					organization_id: organizationId,
					created_by: userId,
					updated_by: userId,
					title: data.title
				})
				.returning();

			const createdStops = data.stops
				? await stopService.bulkCreateStops(
						data.stops.map((stop) => ({ ...stop, map_id: map.id })),
						map.id,
						organizationId,
						userId
					)
				: null;

			return { map, stops: createdStops };
		});
	}

	/**
	 * Update a map
	 */
	async updateMap(
		mapId: string,
		data: UpdateMap,
		organizationId: string,
		userId: string
	) {
		// Atomic update with tenancy check in WHERE clause
		const [updatedMap] = await db
			.update(maps)
			.set({
				...data,
				updated_at: new Date(),
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
	 * Delete a map (cascades to stops and driver memberships)
	 */
	async deleteMap(mapId: string, organizationId: string) {
		// Atomic delete with tenancy check in WHERE clause
		const deleted = await db
			.delete(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.returning();

		if (deleted.length === 0) {
			throw ServiceError.notFound('Map not found');
		}

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
		await this.verifyMapOwnership(mapId, organizationId);

		// Use transaction to ensure both operations succeed or both fail
		await db.transaction(async (tx) => {
			await tx
				.update(stops)
				.set({
					driver_id: null,
					delivery_index: null,
					updated_at: new Date(),
					updated_by: userId
				})
				.where(eq(stops.map_id, mapId));

			await tx.delete(routes).where(eq(routes.map_id, mapId));
		});

		return { success: true };
	}

	// Driver-Map Membership Methods

	/**
	 * Verify driver ownership
	 */
	private async verifyDriverOwnership(
		driverId: string,
		organizationId: string
	) {
		const [driver] = await db
			.select()
			.from(drivers)
			.where(
				and(
					eq(drivers.id, driverId),
					eq(drivers.organization_id, organizationId)
				)
			)
			.limit(1);

		if (!driver) {
			throw ServiceError.notFound('Driver not found');
		}

		return driver;
	}

	/**
	 * Get all drivers assigned to a map
	 */
	async getDriversForMap(mapId: string, organizationId: string) {
		await this.verifyMapOwnership(mapId, organizationId);

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
		await this.verifyDriverOwnership(driverId, organizationId);

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
		await this.verifyDriverOwnership(driverId, organizationId);
		await this.verifyMapOwnership(mapId, organizationId);

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
		organizationId: string
	) {
		const driver = await this.verifyDriverOwnership(driverId, organizationId);
		await this.verifyMapOwnership(mapId, organizationId);

		// Delete membership first
		// Note: Not using transaction because driverService.deleteDriver uses its own db connection,
		// which causes deadlock when called inside a transaction. Risk of orphaned temp driver is acceptable.
		const [deleted] = await db
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

		// Temporary drivers are deleted when removed from the map they were created for
		if (driver.temporary) {
			await driverService.deleteDriver(driverId, organizationId);
		}

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

		return await db.transaction(async (tx) => {
			// Create new map with copied data
			const [newMap] = await tx
				.insert(maps)
				.values({
					organization_id: organizationId,
					title: newTitle || `${sourceMap.title} (Copy)`,
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
