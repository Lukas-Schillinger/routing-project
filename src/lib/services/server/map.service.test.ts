import { db } from '$lib/server/db';
import {
	driverMapMemberships,
	drivers,
	locations,
	maps,
	organizations,
	routes,
	stops,
	users
} from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createOrganization,
	createRoute,
	createStop,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServiceError } from './errors';
import { mapService } from './map.service';

/**
 * Map Service Tests
 *
 * Tests cover:
 * - CRUD operations
 * - Map duplication
 * - Cross-tenant validation (security)
 * - Driver assignment operations
 * - Reset optimization
 * - Audit trail fields
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

// Test fixtures - org1
let testOrg1: { id: string };
let testUser1: { id: string };
let testMap1: { id: string; title: string };
let testDriver1: { id: string };
let testLocation1: { id: string };

// Test fixtures - org2 (for tenancy tests)
let testOrg2: { id: string };
let testUser2: { id: string };
let testMap2: { id: string };
let testDriver2: { id: string };
let testLocation2: { id: string };

// Track created IDs for cleanup
const createdIds = {
	routes: [] as string[],
	stops: [] as string[],
	memberships: [] as string[],
	depots: [] as string[],
	maps: [] as string[],
	locations: [] as string[],
	drivers: [] as string[],
	users: [] as string[],
	orgs: [] as string[]
};

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create org1 and its resources
	testOrg1 = await createOrganization(tx, { name: 'Map Test Org 1' });
	createdIds.orgs.push(testOrg1.id);

	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin'
	});
	createdIds.users.push(testUser1.id);

	testLocation1 = await createLocation(tx, { organization_id: testOrg1.id });
	createdIds.locations.push(testLocation1.id);

	testMap1 = await createMap(tx, {
		organization_id: testOrg1.id,
		title: 'Test Map 1'
	});
	createdIds.maps.push(testMap1.id);

	testDriver1 = await createDriver(tx, {
		organization_id: testOrg1.id,
		active: true
	});
	createdIds.drivers.push(testDriver1.id);

	// Create org2 for cross-tenant tests
	testOrg2 = await createOrganization(tx, { name: 'Map Test Org 2' });
	createdIds.orgs.push(testOrg2.id);

	testUser2 = await createUser(tx, {
		organization_id: testOrg2.id,
		role: 'admin'
	});
	createdIds.users.push(testUser2.id);

	testLocation2 = await createLocation(tx, { organization_id: testOrg2.id });
	createdIds.locations.push(testLocation2.id);

	testMap2 = await createMap(tx, { organization_id: testOrg2.id });
	createdIds.maps.push(testMap2.id);

	testDriver2 = await createDriver(tx, {
		organization_id: testOrg2.id,
		active: true
	});
	createdIds.drivers.push(testDriver2.id);
});

afterAll(async () => {
	// Clean up in correct FK order
	if (createdIds.routes.length > 0) {
		await db.delete(routes).where(inArray(routes.id, createdIds.routes));
	}
	if (createdIds.stops.length > 0) {
		await db.delete(stops).where(inArray(stops.id, createdIds.stops));
	}
	if (createdIds.memberships.length > 0) {
		await db
			.delete(driverMapMemberships)
			.where(inArray(driverMapMemberships.id, createdIds.memberships));
	}
	if (createdIds.depots.length > 0) {
		await db.delete(maps).where(inArray(maps.id, createdIds.depots));
	}
	if (createdIds.maps.length > 0) {
		await db.delete(maps).where(inArray(maps.id, createdIds.maps));
	}
	if (createdIds.locations.length > 0) {
		await db
			.delete(locations)
			.where(inArray(locations.id, createdIds.locations));
	}
	if (createdIds.drivers.length > 0) {
		await db.delete(drivers).where(inArray(drivers.id, createdIds.drivers));
	}
	if (createdIds.users.length > 0) {
		await db.delete(users).where(inArray(users.id, createdIds.users));
	}
	if (createdIds.orgs.length > 0) {
		await db
			.delete(organizations)
			.where(inArray(organizations.id, createdIds.orgs));
	}
});

describe('MapService', () => {
	describe('CRUD Operations', () => {
		describe('createMap()', () => {
			it('creates map with title', async () => {
				const result = await mapService.createMap(
					{ title: 'New Test Map' },
					testOrg1.id,
					testUser1.id
				);
				createdIds.maps.push(result.map.id);

				expect(result.map.id).toBeDefined();
				expect(result.map.title).toBe('New Test Map');
				expect(result.map.organization_id).toBe(testOrg1.id);
				expect(result.stops).toBeNull();
			});

			it('sets audit fields on create', async () => {
				const result = await mapService.createMap(
					{ title: 'Audit Test Map' },
					testOrg1.id,
					testUser1.id
				);
				createdIds.maps.push(result.map.id);

				expect(result.map.created_by).toBe(testUser1.id);
				expect(result.map.updated_by).toBe(testUser1.id);
			});
		});

		describe('getMapById()', () => {
			it('returns map when found', async () => {
				const result = await mapService.getMapById(testMap1.id, testOrg1.id);

				expect(result.id).toBe(testMap1.id);
				expect(result.organization_id).toBe(testOrg1.id);
			});

			it('throws NOT_FOUND for non-existent map', async () => {
				try {
					await mapService.getMapById(NON_EXISTENT_UUID, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});
		});

		describe('getMaps()', () => {
			it('returns all maps for organization', async () => {
				const results = await mapService.getMaps(testOrg1.id);

				expect(results.length).toBeGreaterThanOrEqual(1);
				expect(results.some((m) => m.id === testMap1.id)).toBe(true);
			});

			it('does not return maps from other organizations', async () => {
				const results = await mapService.getMaps(testOrg1.id);

				expect(results.some((m) => m.id === testMap2.id)).toBe(false);
			});
		});

		describe('updateMap()', () => {
			it('updates map title', async () => {
				const tx = db as unknown as TestTransaction;
				const map = await createMap(tx, {
					organization_id: testOrg1.id,
					title: 'Original'
				});
				createdIds.maps.push(map.id);

				const result = await mapService.updateMap(
					map.id,
					{ title: 'Updated Title' },
					testOrg1.id,
					testUser1.id
				);

				expect(result.title).toBe('Updated Title');
			});

			it('updates updated_by on update', async () => {
				const tx = db as unknown as TestTransaction;
				const map = await createMap(tx, { organization_id: testOrg1.id });
				createdIds.maps.push(map.id);

				const result = await mapService.updateMap(
					map.id,
					{ title: 'Updated' },
					testOrg1.id,
					testUser1.id
				);

				expect(result.updated_by).toBe(testUser1.id);
			});

			it('throws NOT_FOUND for non-existent map', async () => {
				try {
					await mapService.updateMap(
						NON_EXISTENT_UUID,
						{ title: 'Updated' },
						testOrg1.id,
						testUser1.id
					);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});
		});

		describe('deleteMap()', () => {
			it('removes map from database', async () => {
				const tx = db as unknown as TestTransaction;
				const map = await createMap(tx, { organization_id: testOrg1.id });
				// Don't track - we're deleting it

				await mapService.deleteMap(map.id, testOrg1.id);

				try {
					await mapService.getMapById(map.id, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});

			it('throws NOT_FOUND for non-existent map', async () => {
				try {
					await mapService.deleteMap(NON_EXISTENT_UUID, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});
		});
	});

	describe('Map Duplication', () => {
		it('duplicates map with default title', async () => {
			const result = await mapService.duplicateMap(
				testMap1.id,
				testOrg1.id,
				testUser1.id
			);
			createdIds.maps.push(result.id);

			expect(result.id).not.toBe(testMap1.id);
			expect(result.title).toBe(`${testMap1.title} (Copy)`);
			expect(result.organization_id).toBe(testOrg1.id);
		});

		it('duplicates map with custom title', async () => {
			const result = await mapService.duplicateMap(
				testMap1.id,
				testOrg1.id,
				testUser1.id,
				'Custom Copy Title'
			);
			createdIds.maps.push(result.id);

			expect(result.title).toBe('Custom Copy Title');
		});

		it('duplicates map copies all stops', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a map with stops
			const sourceMap = await createMap(tx, {
				organization_id: testOrg1.id,
				title: 'Source'
			});
			createdIds.maps.push(sourceMap.id);

			const stop1 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: sourceMap.id,
				location_id: testLocation1.id,
				driver_id: testDriver1.id,
				delivery_index: 1
			});
			createdIds.stops.push(stop1.id);

			// Create another location and stop
			const location2 = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdIds.locations.push(location2.id);

			const stop2 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: sourceMap.id,
				location_id: location2.id
			});
			createdIds.stops.push(stop2.id);

			// Duplicate the map
			const duplicated = await mapService.duplicateMap(
				sourceMap.id,
				testOrg1.id,
				testUser1.id,
				'Duplicated Map'
			);
			createdIds.maps.push(duplicated.id);

			// Get stops from duplicated map
			const duplicatedStops = await db
				.select()
				.from(stops)
				.where(inArray(stops.map_id, [duplicated.id]));

			// Track for cleanup
			duplicatedStops.forEach((s) => createdIds.stops.push(s.id));

			expect(duplicatedStops.length).toBe(2);
		});

		it('duplicated map has no driver assignments', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a map with a stop assigned to a driver
			const sourceMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(sourceMap.id);

			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: sourceMap.id,
				location_id: testLocation1.id,
				driver_id: testDriver1.id,
				delivery_index: 1
			});
			createdIds.stops.push(stop.id);

			// Duplicate the map
			const duplicated = await mapService.duplicateMap(
				sourceMap.id,
				testOrg1.id,
				testUser1.id
			);
			createdIds.maps.push(duplicated.id);

			// Get stops from duplicated map
			const duplicatedStops = await db
				.select()
				.from(stops)
				.where(inArray(stops.map_id, [duplicated.id]));

			// Track for cleanup
			duplicatedStops.forEach((s) => createdIds.stops.push(s.id));

			// Verify no driver assignments
			expect(duplicatedStops.every((s) => s.driver_id === null)).toBe(true);
			expect(duplicatedStops.every((s) => s.delivery_index === null)).toBe(
				true
			);
		});

		it('duplicated stops reference same locations', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a map with a stop
			const sourceMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(sourceMap.id);

			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: sourceMap.id,
				location_id: testLocation1.id
			});
			createdIds.stops.push(stop.id);

			// Duplicate the map
			const duplicated = await mapService.duplicateMap(
				sourceMap.id,
				testOrg1.id,
				testUser1.id
			);
			createdIds.maps.push(duplicated.id);

			// Get stops from duplicated map
			const duplicatedStops = await db
				.select()
				.from(stops)
				.where(inArray(stops.map_id, [duplicated.id]));

			// Track for cleanup
			duplicatedStops.forEach((s) => createdIds.stops.push(s.id));

			// Verify location reference is preserved
			expect(duplicatedStops[0].location_id).toBe(testLocation1.id);
		});
	});

	describe('Tenancy Isolation', () => {
		it('throws FORBIDDEN accessing map from another org', async () => {
			try {
				await mapService.getMapById(testMap2.id, testOrg1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('cannot update map from another org', async () => {
			try {
				await mapService.updateMap(
					testMap2.id,
					{ title: 'Hacked' },
					testOrg1.id,
					testUser1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('cannot delete map from another org', async () => {
			try {
				await mapService.deleteMap(testMap2.id, testOrg1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('getDriversForMap only returns org drivers', async () => {
			// Add driver1 to map1
			const [membership] = await db
				.insert(driverMapMemberships)
				.values({
					organization_id: testOrg1.id,
					driver_id: testDriver1.id,
					map_id: testMap1.id
				})
				.returning();
			createdIds.memberships.push(membership.id);

			const results = await mapService.getDriversForMap(
				testMap1.id,
				testOrg1.id
			);

			// Should only contain drivers from org1
			expect(
				results.every((r) => r.driver.organization_id === testOrg1.id)
			).toBe(true);
		});

		it('getMapsForDriver only returns org maps', async () => {
			const results = await mapService.getMapsForDriver(
				testDriver1.id,
				testOrg1.id
			);

			// Should only contain maps from org1
			expect(results.every((r) => r.map.organization_id === testOrg1.id)).toBe(
				true
			);
		});
	});

	describe('Driver Assignment', () => {
		it('adds driver to map', async () => {
			const tx = db as unknown as TestTransaction;
			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdIds.drivers.push(newDriver.id);

			const result = await mapService.addDriverToMap(
				newDriver.id,
				testMap1.id,
				testOrg1.id
			);
			createdIds.memberships.push(result.id);

			expect(result.driver_id).toBe(newDriver.id);
			expect(result.map_id).toBe(testMap1.id);
		});

		it('throws CONFLICT when adding driver already assigned', async () => {
			const tx = db as unknown as TestTransaction;
			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdIds.drivers.push(newDriver.id);

			const result = await mapService.addDriverToMap(
				newDriver.id,
				testMap1.id,
				testOrg1.id
			);
			createdIds.memberships.push(result.id);

			try {
				await mapService.addDriverToMap(newDriver.id, testMap1.id, testOrg1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('CONFLICT');
			}
		});

		it('removes driver from map', async () => {
			const tx = db as unknown as TestTransaction;
			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdIds.drivers.push(newDriver.id);

			await mapService.addDriverToMap(newDriver.id, testMap1.id, testOrg1.id);
			// Don't track - we're removing it

			await mapService.removeDriverFromMap(
				newDriver.id,
				testMap1.id,
				testOrg1.id
			);

			// Verify driver is removed
			const results = await mapService.getDriversForMap(
				testMap1.id,
				testOrg1.id
			);
			expect(results.some((r) => r.driver.id === newDriver.id)).toBe(false);
		});

		it('throws NOT_FOUND removing unassigned driver', async () => {
			const tx = db as unknown as TestTransaction;
			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdIds.drivers.push(newDriver.id);

			try {
				await mapService.removeDriverFromMap(
					newDriver.id,
					testMap1.id,
					testOrg1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});

	describe('Reset Optimization', () => {
		it('clears driver assignments on reset', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a map with assigned stops
			const map = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(map.id);

			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: map.id,
				location_id: testLocation1.id,
				driver_id: testDriver1.id,
				delivery_index: 1
			});
			createdIds.stops.push(stop.id);

			await mapService.resetOptimization(map.id, testOrg1.id, testUser1.id);

			// Get updated stop
			const [updatedStop] = await db
				.select()
				.from(stops)
				.where(inArray(stops.id, [stop.id]));

			expect(updatedStop.driver_id).toBeNull();
			expect(updatedStop.delivery_index).toBeNull();
		});

		it('deletes routes on reset', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a map with a route
			const map = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(map.id);

			const location = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdIds.locations.push(location.id);

			const depot = await createDepot(tx, {
				organization_id: testOrg1.id,
				location_id: location.id
			});
			createdIds.depots.push(depot.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: map.id,
				driver_id: testDriver1.id,
				depot_id: depot.id
			});
			// Don't track - we expect it to be deleted

			await mapService.resetOptimization(map.id, testOrg1.id, testUser1.id);

			// Verify route is deleted
			const remainingRoutes = await db
				.select()
				.from(routes)
				.where(inArray(routes.id, [route.id]));

			expect(remainingRoutes.length).toBe(0);
		});
	});
});
