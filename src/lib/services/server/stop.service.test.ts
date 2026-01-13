import type { LocationCreate } from '$lib/schemas/location';
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
	createMockLocation,
	createOrganization,
	createStop,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { inArray } from 'drizzle-orm';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { ServiceError } from './errors';
import { stopService } from './stop.service';

// Mock route service to avoid actual route calculations
vi.mock('./route.service', () => ({
	routeService: {
		recalculateRouteForDriver: vi.fn().mockResolvedValue(undefined)
	}
}));

import { routeService } from './route.service';

/**
 * Stop Service Tests
 *
 * These tests use the real database. Test data is cleaned up after each suite.
 * Route recalculation is mocked to focus on stop service logic.
 */

// Valid UUID format that won't exist in the database
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

// Test fixtures
let testOrg1: { id: string };
let testOrg2: { id: string };
let testUser1: { id: string; organization_id: string };
let testMap1: { id: string };
let testMap2: { id: string };
let testDriver1: { id: string };
let testDriver2: { id: string };
let testLocation1: { id: string };
let testLocation2: { id: string };
let testStop1: { id: string; organization_id: string; map_id: string };
let testStop2: { id: string; organization_id: string; map_id: string };
let testStopWithDriver: {
	id: string;
	driver_id: string | null;
	map_id: string;
};

// Track all created IDs for cleanup
const createdStopIds: string[] = [];
const createdMapIds: string[] = [];
const createdLocationIds: string[] = [];
const createdDriverIds: string[] = [];
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create organizations
	testOrg1 = await createOrganization(tx);
	testOrg2 = await createOrganization(tx);
	createdOrgIds.push(testOrg1.id, testOrg2.id);

	// Create user in org1
	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin'
	});
	createdUserIds.push(testUser1.id);

	// Create drivers in org1
	testDriver1 = await createDriver(tx, {
		organization_id: testOrg1.id,
		name: 'Test Driver 1'
	});
	testDriver2 = await createDriver(tx, {
		organization_id: testOrg1.id,
		name: 'Test Driver 2'
	});
	createdDriverIds.push(testDriver1.id, testDriver2.id);

	// Create maps
	testMap1 = await createMap(tx, {
		organization_id: testOrg1.id,
		created_by: testUser1.id
	});
	testMap2 = await createMap(tx, {
		organization_id: testOrg1.id,
		created_by: testUser1.id
	});
	createdMapIds.push(testMap1.id, testMap2.id);

	// Create locations
	testLocation1 = await createLocation(tx, { organization_id: testOrg1.id });
	testLocation2 = await createLocation(tx, { organization_id: testOrg1.id });
	createdLocationIds.push(testLocation1.id, testLocation2.id);

	// Create stops
	testStop1 = await createStop(tx, {
		organization_id: testOrg1.id,
		map_id: testMap1.id,
		location_id: testLocation1.id,
		created_by: testUser1.id
	});
	testStop2 = await createStop(tx, {
		organization_id: testOrg1.id,
		map_id: testMap1.id,
		location_id: testLocation2.id,
		created_by: testUser1.id
	});
	testStopWithDriver = await createStop(tx, {
		organization_id: testOrg1.id,
		map_id: testMap1.id,
		location_id: testLocation1.id,
		driver_id: testDriver1.id,
		delivery_index: 1,
		created_by: testUser1.id
	});
	createdStopIds.push(testStop1.id, testStop2.id, testStopWithDriver.id);
});

beforeEach(() => {
	vi.clearAllMocks();
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

describe('StopService', () => {
	describe('getStops()', () => {
		it('returns all stops for an organization', async () => {
			const result = await stopService.getStops(testOrg1.id);

			expect(result.length).toBeGreaterThanOrEqual(3);
			const stopIds = result.map((s) => s.id);
			expect(stopIds).toContain(testStop1.id);
			expect(stopIds).toContain(testStop2.id);
		});

		it('returns empty array when no stops exist', async () => {
			const result = await stopService.getStops(testOrg2.id);

			expect(result).toHaveLength(0);
		});
	});

	describe('getStopsWithLocation()', () => {
		it('returns stops with joined location data', async () => {
			const result = await stopService.getStopsWithLocation(testOrg1.id);

			expect(result.length).toBeGreaterThanOrEqual(3);

			const stop = result.find((r) => r.stop.id === testStop1.id);
			expect(stop).toBeDefined();
			expect(stop!.location).toBeDefined();
			expect(stop!.location.id).toBe(testLocation1.id);
		});
	});

	describe('getStopsByMap()', () => {
		it('returns all stops for a map with location data', async () => {
			const result = await stopService.getStopsByMap(testMap1.id, testOrg1.id);

			expect(result.length).toBeGreaterThanOrEqual(3);
			const stopIds = result.map((r) => r.stop.id);
			expect(stopIds).toContain(testStop1.id);
			expect(stopIds).toContain(testStop2.id);
		});

		it('filters by driver_id when provided', async () => {
			const result = await stopService.getStopsByMap(testMap1.id, testOrg1.id, {
				driver_id: testDriver1.id
			});

			const stopIds = result.map((r) => r.stop.id);
			expect(stopIds).toContain(testStopWithDriver.id);

			// Should not include stops without this driver
			result.forEach((r) => {
				expect(r.stop.driver_id).toBe(testDriver1.id);
			});
		});

		it('throws NOT_FOUND when map does not exist', async () => {
			await expect(
				stopService.getStopsByMap(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.getStopsByMap(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws NOT_FOUND when map belongs to different organization', async () => {
			await expect(
				stopService.getStopsByMap(testMap1.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.getStopsByMap(testMap1.id, testOrg2.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});

	describe('getStopsForRoute()', () => {
		it('returns only stops with delivery_index assigned', async () => {
			const result = await stopService.getStopsForRoute(
				testMap1.id,
				testDriver1.id,
				testOrg1.id
			);

			expect(result.length).toBeGreaterThanOrEqual(1);
			result.forEach((r) => {
				expect(r.stop.delivery_index).not.toBeNull();
				expect(r.stop.driver_id).toBe(testDriver1.id);
			});
		});

		it('returns empty array when no routed stops exist', async () => {
			const result = await stopService.getStopsForRoute(
				testMap1.id,
				testDriver2.id,
				testOrg1.id
			);

			expect(result).toHaveLength(0);
		});
	});

	describe('getStopById()', () => {
		it('returns stop with location data', async () => {
			const result = await stopService.getStopById(testStop1.id, testOrg1.id);

			expect(result.stop.id).toBe(testStop1.id);
			expect(result.location).toBeDefined();
			expect(result.location.id).toBe(testLocation1.id);
		});

		it('throws NOT_FOUND when stop does not exist', async () => {
			await expect(
				stopService.getStopById(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.getStopById(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN when stop belongs to different organization', async () => {
			await expect(
				stopService.getStopById(testStop1.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.getStopById(testStop1.id, testOrg2.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	describe('createStop()', () => {
		it('creates stop with existing location_id', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);

			const result = await stopService.createStop(
				{
					map_id: testMap1.id,
					location_id: location.id,
					contact_name: 'Test Contact',
					contact_phone: '555-1234',
					notes: 'Test notes'
				},
				testOrg1.id,
				testUser1.id
			);
			createdStopIds.push(result.stop.id);

			expect(result.stop.id).toBeDefined();
			expect(result.stop.organization_id).toBe(testOrg1.id);
			expect(result.stop.map_id).toBe(testMap1.id);
			expect(result.stop.location_id).toBe(location.id);
			expect(result.stop.contact_name).toBe('Test Contact');
			expect(result.stop.contact_phone).toBe('555-1234');
			expect(result.stop.notes).toBe('Test notes');
		});

		it('creates stop with inline location data', async () => {
			const locationData = createMockLocation({
				organization_id: testOrg1.id
			}) as LocationCreate;

			const result = await stopService.createStop(
				{
					map_id: testMap1.id,
					location: locationData,
					contact_name: 'Inline Location Test'
				},
				testOrg1.id,
				testUser1.id
			);
			createdStopIds.push(result.stop.id);
			createdLocationIds.push(result.location.id);

			expect(result.stop.id).toBeDefined();
			expect(result.location.address_line_1).toBe(locationData.address_line_1);
		});

		it('sets audit fields correctly', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);

			const result = await stopService.createStop(
				{
					map_id: testMap1.id,
					location_id: location.id
				},
				testOrg1.id,
				testUser1.id
			);
			createdStopIds.push(result.stop.id);

			expect(result.stop.created_by).toBe(testUser1.id);
			expect(result.stop.updated_by).toBe(testUser1.id);
		});

		it('throws VALIDATION when neither location_id nor location data is provided', async () => {
			await expect(
				stopService.createStop(
					{
						map_id: testMap1.id
					},
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.createStop(
					{ map_id: testMap1.id },
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('VALIDATION');
			}
		});

		it('throws NOT_FOUND for invalid map', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);

			await expect(
				stopService.createStop(
					{
						map_id: NON_EXISTENT_UUID,
						location_id: location.id
					},
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.createStop(
					{
						map_id: NON_EXISTENT_UUID,
						location_id: location.id
					},
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});

	describe('updateStop()', () => {
		it('updates stop fields', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);
			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				location_id: location.id,
				created_by: testUser1.id
			});
			createdStopIds.push(stop.id);

			const result = await stopService.updateStop(
				stop.id,
				{
					contact_name: 'Updated Name',
					contact_phone: '999-8888',
					notes: 'Updated notes'
				},
				testOrg1.id,
				testUser1.id
			);

			expect(result.stop.contact_name).toBe('Updated Name');
			expect(result.stop.contact_phone).toBe('999-8888');
			expect(result.stop.notes).toBe('Updated notes');
			expect(result.stop.updated_by).toBe(testUser1.id);
		});

		it('triggers route recalculation when driver changes', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);
			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				location_id: location.id,
				driver_id: testDriver1.id,
				created_by: testUser1.id
			});
			createdStopIds.push(stop.id);

			await stopService.updateStop(
				stop.id,
				{ driver_id: testDriver2.id },
				testOrg1.id,
				testUser1.id
			);

			// Should recalculate for old driver
			expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
				testMap1.id,
				testDriver1.id,
				testOrg1.id
			);
			// Should recalculate for new driver
			expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
				testMap1.id,
				testDriver2.id,
				testOrg1.id
			);
		});

		it('triggers route recalculation when driver is removed (set to null)', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);
			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				location_id: location.id,
				driver_id: testDriver1.id,
				created_by: testUser1.id
			});
			createdStopIds.push(stop.id);

			await stopService.updateStop(
				stop.id,
				{ driver_id: null },
				testOrg1.id,
				testUser1.id
			);

			// Should recalculate for old driver
			expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
				testMap1.id,
				testDriver1.id,
				testOrg1.id
			);
		});

		it('does not trigger route recalculation when driver stays the same', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);
			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				location_id: location.id,
				driver_id: testDriver1.id,
				created_by: testUser1.id
			});
			createdStopIds.push(stop.id);

			await stopService.updateStop(
				stop.id,
				{ contact_name: 'No driver change' },
				testOrg1.id,
				testUser1.id
			);

			expect(routeService.recalculateRouteForDriver).not.toHaveBeenCalled();
		});

		it('throws NOT_FOUND for non-existent stop', async () => {
			await expect(
				stopService.updateStop(
					NON_EXISTENT_UUID,
					{ contact_name: 'Test' },
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.updateStop(
					NON_EXISTENT_UUID,
					{ contact_name: 'Test' },
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});

	describe('deleteStop()', () => {
		it('deletes stop and returns success', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);
			const stopToDelete = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				location_id: location.id,
				created_by: testUser1.id
			});

			const result = await stopService.deleteStop(stopToDelete.id, testOrg1.id);

			expect(result).toEqual({ success: true });

			await expect(
				stopService.getStopById(stopToDelete.id, testOrg1.id)
			).rejects.toThrow(ServiceError);
		});

		it('triggers route recalculation when deleted stop had a driver', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);
			const stopToDelete = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				location_id: location.id,
				driver_id: testDriver1.id,
				created_by: testUser1.id
			});

			await stopService.deleteStop(stopToDelete.id, testOrg1.id);

			expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
				testMap1.id,
				testDriver1.id,
				testOrg1.id
			);
		});

		it('does not trigger route recalculation when deleted stop had no driver', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);
			const stopToDelete = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				location_id: location.id,
				created_by: testUser1.id
			});

			await stopService.deleteStop(stopToDelete.id, testOrg1.id);

			expect(routeService.recalculateRouteForDriver).not.toHaveBeenCalled();
		});

		it('throws NOT_FOUND for non-existent stop', async () => {
			await expect(
				stopService.deleteStop(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.deleteStop(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN for stop from different organization', async () => {
			await expect(
				stopService.deleteStop(testStop1.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.deleteStop(testStop1.id, testOrg2.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}

			// Verify stop was NOT deleted
			const stop = await stopService.getStopById(testStop1.id, testOrg1.id);
			expect(stop.stop.id).toBe(testStop1.id);
		});
	});

	describe('bulkCreateStops()', () => {
		it('creates multiple stops for a map', async () => {
			const tx = db as unknown as TestTransaction;
			const location1 = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			const location2 = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location1.id, location2.id);

			const result = await stopService.bulkCreateStops(
				[
					{ location_id: location1.id, contact_name: 'Bulk 1' },
					{ location_id: location2.id, contact_name: 'Bulk 2' }
				],
				testMap1.id,
				testOrg1.id,
				testUser1.id
			);

			expect(result).toHaveLength(2);
			result.forEach((r) => {
				createdStopIds.push(r.stop.id);
				expect(r.stop.map_id).toBe(testMap1.id);
				expect(r.stop.organization_id).toBe(testOrg1.id);
			});
		});

		it('throws NOT_FOUND for invalid map', async () => {
			const tx = db as unknown as TestTransaction;
			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(location.id);

			await expect(
				stopService.bulkCreateStops(
					[{ location_id: location.id }],
					NON_EXISTENT_UUID,
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await stopService.bulkCreateStops(
					[{ location_id: location.id }],
					NON_EXISTENT_UUID,
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});
});
