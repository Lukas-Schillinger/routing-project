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
	 */
	async createMap(
		data: CreateMap,
		organizationId: string,
		userId: string
	): Promise<{ map: Map; stops: StopWithLocation[] | null }> {
		const [map] = await db
			.insert(maps)
			.values({
				organization_id: organizationId,
				created_by: userId,
				updated_by: userId,
				title: data.title
			})
			.returning();

		const stops = data.stops
			? await stopService.bulkCreateStops(
					data.stops.map((stop) => ({ ...stop, map_id: map.id })),
					map.id,
					organizationId,
					userId
				)
			: null;

		return { map, stops };
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
		await this.verifyMapOwnership(mapId, organizationId);

		const [updatedMap] = await db
			.update(maps)
			.set({
				...data,
				updated_at: new Date(),
				updated_by: userId
			})
			.where(eq(maps.id, mapId))
			.returning();

		return updatedMap;
	}

	/**
	 * Delete a map (cascades to stops and driver memberships)
	 */
	async deleteMap(mapId: string, organizationId: string) {
		await this.verifyMapOwnership(mapId, organizationId);

		await db.delete(maps).where(eq(maps.id, mapId));

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

		await db
			.update(stops)
			.set({
				driver_id: null,
				delivery_index: null,
				updated_at: new Date(),
				updated_by: userId
			})
			.where(eq(stops.map_id, mapId));

		await db.delete(routes).where(eq(routes.map_id, mapId));

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
			.where(eq(driverMapMemberships.map_id, mapId));

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
			.where(eq(driverMapMemberships.driver_id, driverId));

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
}

// Singleton instance
export const mapService = new MapService();
