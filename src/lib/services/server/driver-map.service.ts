import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, maps } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export class DriverMapService {
	/**
	 * Verify map ownership
	 */
	private async verifyMapOwnership(mapId: string, organizationId: string) {
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
	 * Verify driver ownership
	 */
	private async verifyDriverOwnership(driverId: string, organizationId: string) {
		const [driver] = await db
			.select()
			.from(drivers)
			.where(and(eq(drivers.id, driverId), eq(drivers.organization_id, organizationId)))
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
	async addDriverToMap(driverId: string, mapId: string, organizationId: string) {
		await this.verifyDriverOwnership(driverId, organizationId);
		await this.verifyMapOwnership(mapId, organizationId);

		// Check if membership already exists
		const [existing] = await db
			.select()
			.from(driverMapMemberships)
			.where(
				and(eq(driverMapMemberships.driver_id, driverId), eq(driverMapMemberships.map_id, mapId))
			)
			.limit(1);

		if (existing) {
			throw ServiceError.conflict('Driver is already assigned to this map');
		}

		const [membership] = await db
			.insert(driverMapMemberships)
			.values({
				driver_id: driverId,
				map_id: mapId
			})
			.returning();

		return membership;
	}

	/**
	 * Remove a driver from a map
	 */
	async removeDriverFromMap(driverId: string, mapId: string, organizationId: string) {
		await this.verifyDriverOwnership(driverId, organizationId);
		await this.verifyMapOwnership(mapId, organizationId);

		const [deleted] = await db
			.delete(driverMapMemberships)
			.where(
				and(eq(driverMapMemberships.driver_id, driverId), eq(driverMapMemberships.map_id, mapId))
			)
			.returning();

		if (!deleted) {
			throw ServiceError.notFound('Driver is not assigned to this map');
		}

		return { success: true };
	}
}

// Singleton instance
export const driverMapService = new DriverMapService();
