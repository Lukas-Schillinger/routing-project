import { db } from '$lib/server/db';
import {
	drivers,
	locations,
	maps,
	organizations,
	stops,
	users
} from '$lib/server/db/schema';
import {
	createDriver,
	createLocation,
	createMap,
	createOrganization,
	createStop,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { driverService } from './driver.service';
import { ServiceError } from './errors';

/**
 * Driver Service Tests
 *
 * These tests use the real database. Test data is cleaned up after each suite.
 * Uses factories from $lib/testing for consistent test data generation.
 */

// Valid UUID format that won't exist in the database
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

// Test fixtures
let testOrg1: { id: string };
let testOrg2: { id: string };
let testUser1: { id: string; organization_id: string };
let testDriver1: {
	id: string;
	name: string;
	organization_id: string;
	color: string;
};
let testDriver2: { id: string; name: string; organization_id: string };
let testDriverOrg2: { id: string; organization_id: string };

// Track all created IDs for cleanup
const createdStopIds: string[] = [];
const createdMapIds: string[] = [];
const createdLocationIds: string[] = [];
const createdDriverIds: string[] = [];
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create two organizations for tenancy testing
	testOrg1 = await createOrganization(tx);
	testOrg2 = await createOrganization(tx);
	createdOrgIds.push(testOrg1.id, testOrg2.id);

	// Create user in org1 for audit fields
	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin'
	});
	createdUserIds.push(testUser1.id);

	// Create drivers in org1
	testDriver1 = await createDriver(tx, {
		organization_id: testOrg1.id,
		name: 'Alice Driver',
		active: true
	});
	testDriver2 = await createDriver(tx, {
		organization_id: testOrg1.id,
		name: 'Bob Driver',
		active: false
	});
	createdDriverIds.push(testDriver1.id, testDriver2.id);

	// Create driver in org2 for tenancy testing
	testDriverOrg2 = await createDriver(tx, {
		organization_id: testOrg2.id,
		name: 'Org2 Driver'
	});
	createdDriverIds.push(testDriverOrg2.id);
});

afterAll(async () => {
	// Clean up in correct FK order
	if (createdStopIds.length > 0) {
		await db.delete(stops).where(inArray(stops.id, createdStopIds));
	}
	if (createdMapIds.length > 0) {
		await db.delete(maps).where(inArray(maps.id, createdMapIds));
	}
	if (createdLocationIds.length > 0) {
		await db.delete(locations).where(inArray(locations.id, createdLocationIds));
	}
	if (createdDriverIds.length > 0) {
		await db.delete(drivers).where(inArray(drivers.id, createdDriverIds));
	}
	if (createdUserIds.length > 0) {
		await db.delete(users).where(inArray(users.id, createdUserIds));
	}
	if (createdOrgIds.length > 0) {
		await db
			.delete(organizations)
			.where(inArray(organizations.id, createdOrgIds));
	}
});

describe('DriverService', () => {
	describe('getDrivers()', () => {
		it('returns all drivers for an organization', async () => {
			const result = await driverService.getDrivers(testOrg1.id);

			expect(result.length).toBeGreaterThanOrEqual(2);
			const driverIds = result.map((d) => d.id);
			expect(driverIds).toContain(testDriver1.id);
			expect(driverIds).toContain(testDriver2.id);
		});

		it('returns drivers ordered by active (desc) then name', async () => {
			const result = await driverService.getDrivers(testOrg1.id);

			// Active drivers should come first
			const activeDrivers = result.filter((d) => d.active);
			const inactiveDrivers = result.filter((d) => !d.active);

			// All active drivers should appear before inactive ones
			if (activeDrivers.length > 0 && inactiveDrivers.length > 0) {
				const lastActiveIndex = result.findIndex(
					(d) => d.id === activeDrivers.at(-1)?.id
				);
				const firstInactiveIndex = result.findIndex(
					(d) => d.id === inactiveDrivers[0]?.id
				);
				expect(lastActiveIndex).toBeLessThan(firstInactiveIndex);
			}
		});

		it('does not include drivers from other organizations (tenancy)', async () => {
			const result1 = await driverService.getDrivers(testOrg1.id);
			const result2 = await driverService.getDrivers(testOrg2.id);

			const org1DriverIds = result1.map((d) => d.id);
			const org2DriverIds = result2.map((d) => d.id);

			// Org1 drivers should not appear in org2 results
			expect(org2DriverIds).not.toContain(testDriver1.id);
			expect(org2DriverIds).not.toContain(testDriver2.id);

			// Org2 driver should not appear in org1 results
			expect(org1DriverIds).not.toContain(testDriverOrg2.id);
		});

		it('returns empty array when no drivers exist', async () => {
			const tx = db as unknown as TestTransaction;
			const emptyOrg = await createOrganization(tx);
			createdOrgIds.push(emptyOrg.id);

			const result = await driverService.getDrivers(emptyOrg.id);

			expect(result).toHaveLength(0);
		});
	});

	describe('getDriverById()', () => {
		it('returns driver when found', async () => {
			const result = await driverService.getDriverById(
				testDriver1.id,
				testOrg1.id
			);

			expect(result.id).toBe(testDriver1.id);
			expect(result.name).toBe(testDriver1.name);
			expect(result.organization_id).toBe(testOrg1.id);
		});

		it('throws NOT_FOUND when driver does not exist', async () => {
			await expect(
				driverService.getDriverById(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await driverService.getDriverById(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN for driver in different organization (tenancy)', async () => {
			// Try to access org2's driver with org1's ID
			await expect(
				driverService.getDriverById(testDriverOrg2.id, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await driverService.getDriverById(testDriverOrg2.id, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	describe('createDriver()', () => {
		it('creates driver with all provided fields', async () => {
			const result = await driverService.createDriver(
				{
					name: 'New Driver',
					color: '#FF5733',
					phone: '555-1234',
					notes: 'Test notes',
					active: true,
					temporary: true
				},
				testOrg1.id,
				testUser1.id
			);
			createdDriverIds.push(result.id);

			expect(result.id).toBeDefined();
			expect(result.name).toBe('New Driver');
			expect(result.color).toBe('#FF5733');
			expect(result.phone).toBe('555-1234');
			expect(result.notes).toBe('Test notes');
			expect(result.active).toBe(true);
			expect(result.temporary).toBe(true);
		});

		it('sets organization_id, created_by, updated_by correctly', async () => {
			const result = await driverService.createDriver(
				{
					name: 'Audit Test Driver',
					color: '#AABBCC',
					active: true,
					temporary: false
				},
				testOrg1.id,
				testUser1.id
			);
			createdDriverIds.push(result.id);

			expect(result.organization_id).toBe(testOrg1.id);
			expect(result.created_by).toBe(testUser1.id);
			expect(result.updated_by).toBe(testUser1.id);
		});

		it('trims the name field', async () => {
			const result = await driverService.createDriver(
				{
					name: '  Trimmed Name  ',
					color: '#123456',
					active: true,
					temporary: false
				},
				testOrg1.id,
				testUser1.id
			);
			createdDriverIds.push(result.id);

			expect(result.name).toBe('Trimmed Name');
		});

		it('sets phone and notes to null when not provided', async () => {
			const result = await driverService.createDriver(
				{
					name: 'Minimal Driver',
					color: '#ABCDEF',
					active: true,
					temporary: false
				},
				testOrg1.id,
				testUser1.id
			);
			createdDriverIds.push(result.id);

			expect(result.phone).toBeNull();
			expect(result.notes).toBeNull();
		});

		it('uses provided active and temporary values', async () => {
			const result = await driverService.createDriver(
				{
					name: 'Custom Flags Driver',
					color: '#112233',
					active: false,
					temporary: true
				},
				testOrg1.id,
				testUser1.id
			);
			createdDriverIds.push(result.id);

			expect(result.active).toBe(false);
			expect(result.temporary).toBe(true);
		});

		it('returns the created driver', async () => {
			const result = await driverService.createDriver(
				{
					name: 'Return Test',
					color: '#FEDCBA',
					active: true,
					temporary: false
				},
				testOrg1.id,
				testUser1.id
			);
			createdDriverIds.push(result.id);

			expect(result.id).toBeDefined();
			expect(result.created_at).toBeInstanceOf(Date);
			expect(result.updated_at).toBeInstanceOf(Date);
		});
	});

	describe('updateDriver()', () => {
		it('updates driver name and trims it', async () => {
			const originalName = testDriver1.name;

			const result = await driverService.updateDriver(
				testDriver1.id,
				{ name: '  Updated Name  ' },
				testOrg1.id,
				testUser1.id
			);

			expect(result.name).toBe('Updated Name');

			// Restore original name
			await driverService.updateDriver(
				testDriver1.id,
				{ name: originalName },
				testOrg1.id,
				testUser1.id
			);
		});

		it('updates phone, notes, active, temporary, color fields', async () => {
			const tx = db as unknown as TestTransaction;
			const driver = await createDriver(tx, {
				organization_id: testOrg1.id,
				phone: '555-0000',
				notes: 'Original notes',
				active: true,
				temporary: false,
				color: '#000000'
			});
			createdDriverIds.push(driver.id);

			const result = await driverService.updateDriver(
				driver.id,
				{
					phone: '555-9999',
					notes: 'Updated notes',
					active: false,
					temporary: true,
					color: '#FFFFFF'
				},
				testOrg1.id,
				testUser1.id
			);

			expect(result.phone).toBe('555-9999');
			expect(result.notes).toBe('Updated notes');
			expect(result.active).toBe(false);
			expect(result.temporary).toBe(true);
			expect(result.color).toBe('#FFFFFF');
		});

		it('sets updated_at and updated_by correctly', async () => {
			const beforeUpdate = new Date();

			const result = await driverService.updateDriver(
				testDriver1.id,
				{ notes: 'Timestamp test' },
				testOrg1.id,
				testUser1.id
			);

			expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(
				beforeUpdate.getTime()
			);
			expect(result.updated_by).toBe(testUser1.id);

			// Clean up
			await driverService.updateDriver(
				testDriver1.id,
				{ notes: null },
				testOrg1.id,
				testUser1.id
			);
		});

		it('throws NOT_FOUND for non-existent driver', async () => {
			await expect(
				driverService.updateDriver(
					NON_EXISTENT_UUID,
					{ name: 'Test' },
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await driverService.updateDriver(
					NON_EXISTENT_UUID,
					{ name: 'Test' },
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN for driver in different organization (tenancy)', async () => {
			await expect(
				driverService.updateDriver(
					testDriverOrg2.id,
					{ name: 'Hacked' },
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await driverService.updateDriver(
					testDriverOrg2.id,
					{ name: 'Hacked' },
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('returns updated driver', async () => {
			const result = await driverService.updateDriver(
				testDriver1.id,
				{ notes: 'Return test' },
				testOrg1.id,
				testUser1.id
			);

			expect(result.id).toBe(testDriver1.id);
			expect(result.notes).toBe('Return test');

			// Clean up
			await driverService.updateDriver(
				testDriver1.id,
				{ notes: null },
				testOrg1.id,
				testUser1.id
			);
		});
	});

	describe('deleteDriver()', () => {
		it('removes driver from database', async () => {
			const tx = db as unknown as TestTransaction;
			const driverToDelete = await createDriver(tx, {
				organization_id: testOrg1.id
			});

			await driverService.deleteDriver(driverToDelete.id, testOrg1.id);

			await expect(
				driverService.getDriverById(driverToDelete.id, testOrg1.id)
			).rejects.toThrow(ServiceError);
		});

		it('returns { success: true } on successful deletion', async () => {
			const tx = db as unknown as TestTransaction;
			const driverToDelete = await createDriver(tx, {
				organization_id: testOrg1.id
			});

			const result = await driverService.deleteDriver(
				driverToDelete.id,
				testOrg1.id
			);

			expect(result).toEqual({ success: true });
		});

		it('throws NOT_FOUND for non-existent driver', async () => {
			await expect(
				driverService.deleteDriver(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await driverService.deleteDriver(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN for driver in different organization (tenancy)', async () => {
			await expect(
				driverService.deleteDriver(testDriverOrg2.id, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await driverService.deleteDriver(testDriverOrg2.id, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('throws VALIDATION error when driver is assigned to stops', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a driver to assign to a stop
			const driverWithStop = await createDriver(tx, {
				organization_id: testOrg1.id,
				name: 'Driver With Stop'
			});
			createdDriverIds.push(driverWithStop.id);

			// Create required entities for a stop
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);

			const map = await createMap(tx, {
				organization_id: testOrg1.id
			});
			createdMapIds.push(map.id);

			// Create a stop assigned to this driver
			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: map.id,
				location_id: location.id,
				driver_id: driverWithStop.id
			});
			createdStopIds.push(stop.id);

			// Attempt to delete the driver should fail
			await expect(
				driverService.deleteDriver(driverWithStop.id, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await driverService.deleteDriver(driverWithStop.id, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('VALIDATION');
				expect((e as ServiceError).message).toBe(
					'Drivers cannot be deleted when assigned to stops'
				);
			}
		});
	});
});
