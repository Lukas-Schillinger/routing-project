import type { Driver, DriverCreate, DriverUpdate } from '$lib/schemas/driver';
import { db } from '$lib/server/db';
import { drivers } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export class DriverService {
	/**
	 * Get all drivers for an organization
	 */
	async getDrivers(organizationId: string): Promise<Driver[]> {
		return db
			.select()
			.from(drivers)
			.where(eq(drivers.organization_id, organizationId))
			.orderBy(desc(drivers.active), drivers.name);
	}

	/**
	 * Get a specific driver by ID
	 */
	async getDriverById(driverId: string, organizationId: string): Promise<Driver> {
		const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);

		if (!driver) {
			throw ServiceError.notFound('Driver not found');
		}

		if (driver.organization_id !== organizationId) {
			throw ServiceError.forbidden('Access denied');
		}

		return driver;
	}

	/**
	 * Create a new driver
	 */
	async createDriver(data: DriverCreate, organizationId: string): Promise<Driver> {
		const [newDriver] = await db
			.insert(drivers)
			.values({
				organization_id: organizationId,
				name: data.name.trim(),
				phone: data.phone || null,
				notes: data.notes || null,
				active: data.active ?? true,
				temporary: data.temporary ?? false
			})
			.returning();

		return newDriver;
	}

	/**
	 * Update a driver
	 */
	async updateDriver(
		driverId: string,
		data: DriverUpdate,
		organizationId: string
	): Promise<Driver> {
		// Verify driver ownership
		await this.getDriverById(driverId, organizationId);

		// Update driver
		const [updatedDriver] = await db
			.update(drivers)
			.set({
				name: data.name?.trim(),
				phone: data.phone,
				notes: data.notes,
				active: data.active,
				temporary: data.temporary,
				updated_at: new Date()
			})
			.where(eq(drivers.id, driverId))
			.returning();

		return updatedDriver;
	}

	/**
	 * Delete a driver
	 */
	async deleteDriver(driverId: string, organizationId: string): Promise<{ success: boolean }> {
		// Verify driver ownership
		await this.getDriverById(driverId, organizationId);

		await db.delete(drivers).where(eq(drivers.id, driverId));

		return { success: true };
	}

	/**
	 * Get active drivers for an organization
	 */
	async getActiveDrivers(organizationId: string): Promise<Driver[]> {
		return db
			.select()
			.from(drivers)
			.where(eq(drivers.organization_id, organizationId))
			.orderBy(drivers.name);
	}
}

// Singleton instance
export const driverService = new DriverService();
