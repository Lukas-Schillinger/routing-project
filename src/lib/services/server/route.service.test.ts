import { db } from '$lib/server/db';
import {
	depots,
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
import { routeService } from './route.service';

/**
 * Route Service Tests
 *
 * Tests cover:
 * - CRUD operations
 * - Cross-tenant validation (security)
 * - Audit trail fields
 * - Error handling
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

// Test fixtures - org1
let testOrg1: { id: string };
let testUser1: typeof users.$inferSelect;
let testMap1: { id: string };
let testDriver1: { id: string };
let testDepot1: { id: string };
let testLocation1: { id: string };

// Test fixtures - org2 (for tenancy tests)
let testOrg2: { id: string };
let testMap2: { id: string };
let testDriver2: { id: string };
let testDepot2: { id: string };
let testLocation2: { id: string };

// Track created IDs for cleanup
const createdRouteIds: string[] = [];
const createdStopIds: string[] = [];
const createdDepotIds: string[] = [];
const createdMapIds: string[] = [];
const createdLocationIds: string[] = [];
const createdDriverIds: string[] = [];
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create org1 and its resources
	testOrg1 = await createOrganization(tx, { name: 'Route Test Org 1' });
	createdOrgIds.push(testOrg1.id);

	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin'
	});
	createdUserIds.push(testUser1.id);

	testLocation1 = await createLocation(tx, { organization_id: testOrg1.id });
	createdLocationIds.push(testLocation1.id);

	testMap1 = await createMap(tx, { organization_id: testOrg1.id });
	createdMapIds.push(testMap1.id);

	testDriver1 = await createDriver(tx, {
		organization_id: testOrg1.id,
		active: true
	});
	createdDriverIds.push(testDriver1.id);

	testDepot1 = await createDepot(tx, {
		organization_id: testOrg1.id,
		location_id: testLocation1.id,
		default_depot: true
	});
	createdDepotIds.push(testDepot1.id);

	// Create org2 for cross-tenant tests
	testOrg2 = await createOrganization(tx, { name: 'Route Test Org 2' });
	createdOrgIds.push(testOrg2.id);

	testLocation2 = await createLocation(tx, { organization_id: testOrg2.id });
	createdLocationIds.push(testLocation2.id);

	testMap2 = await createMap(tx, { organization_id: testOrg2.id });
	createdMapIds.push(testMap2.id);

	testDriver2 = await createDriver(tx, {
		organization_id: testOrg2.id,
		active: true
	});
	createdDriverIds.push(testDriver2.id);

	testDepot2 = await createDepot(tx, {
		organization_id: testOrg2.id,
		location_id: testLocation2.id,
		default_depot: true
	});
	createdDepotIds.push(testDepot2.id);
});

afterAll(async () => {
	// Clean up in correct FK order
	if (createdStopIds.length > 0) {
		await db.delete(stops).where(inArray(stops.id, createdStopIds));
	}
	if (createdRouteIds.length > 0) {
		await db.delete(routes).where(inArray(routes.id, createdRouteIds));
	}
	if (createdDepotIds.length > 0) {
		await db.delete(depots).where(inArray(depots.id, createdDepotIds));
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

describe('RouteService', () => {
	describe('CRUD Operations', () => {
		describe('upsertRoute()', () => {
			it('creates new route when none exists', async () => {
				const result = await routeService.upsertRoute(
					{
						organization_id: testOrg1.id,
						map_id: testMap1.id,
						driver_id: testDriver1.id,
						depot_id: testDepot1.id,
						geometry: {
							type: 'LineString',
							coordinates: [
								[-81.95, 28.03],
								[-81.96, 28.04]
							]
						},
						duration: 600
					},
					testUser1.id
				);
				createdRouteIds.push(result.id);

				expect(result.id).toBeDefined();
				expect(result.organization_id).toBe(testOrg1.id);
				expect(result.map_id).toBe(testMap1.id);
				expect(result.driver_id).toBe(testDriver1.id);
				expect(result.depot_id).toBe(testDepot1.id);
			});

			it('updates existing route for same map/driver', async () => {
				// Create initial route
				const initial = await routeService.upsertRoute(
					{
						organization_id: testOrg1.id,
						map_id: testMap1.id,
						driver_id: testDriver1.id,
						depot_id: testDepot1.id,
						geometry: {
							type: 'LineString',
							coordinates: [[-81.95, 28.03]]
						},
						duration: 600
					},
					testUser1.id
				);
				createdRouteIds.push(initial.id);

				// Upsert with new duration
				const updated = await routeService.upsertRoute(
					{
						organization_id: testOrg1.id,
						map_id: testMap1.id,
						driver_id: testDriver1.id,
						depot_id: testDepot1.id,
						geometry: {
							type: 'LineString',
							coordinates: [
								[-81.96, 28.04],
								[-81.97, 28.05]
							]
						},
						duration: 900
					},
					testUser1.id
				);

				expect(updated.id).toBe(initial.id);
				expect(parseFloat(updated.duration!)).toBe(900);
			});
		});

		describe('getRouteById()', () => {
			it('returns route when found', async () => {
				const tx = db as unknown as TestTransaction;
				// Create a new driver to avoid unique constraint issues
				const newDriver = await createDriver(tx, {
					organization_id: testOrg1.id,
					active: true
				});
				createdDriverIds.push(newDriver.id);

				const route = await createRoute(tx, {
					organization_id: testOrg1.id,
					map_id: testMap1.id,
					driver_id: newDriver.id,
					depot_id: testDepot1.id
				});
				createdRouteIds.push(route.id);

				const result = await routeService.getRouteById(route.id, testOrg1.id);

				expect(result.id).toBe(route.id);
				expect(result.organization_id).toBe(testOrg1.id);
			});

			it('throws NOT_FOUND for non-existent route', async () => {
				try {
					await routeService.getRouteById(NON_EXISTENT_UUID, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});
		});

		describe('getRoutesByMap()', () => {
			it('returns all routes for a map', async () => {
				const tx = db as unknown as TestTransaction;
				// Create a new driver to avoid unique constraint issues
				const newDriver = await createDriver(tx, {
					organization_id: testOrg1.id,
					active: true
				});
				createdDriverIds.push(newDriver.id);

				const route = await createRoute(tx, {
					organization_id: testOrg1.id,
					map_id: testMap1.id,
					driver_id: newDriver.id,
					depot_id: testDepot1.id
				});
				createdRouteIds.push(route.id);

				const results = await routeService.getRoutesByMap(
					testMap1.id,
					testOrg1.id
				);

				expect(results.length).toBeGreaterThanOrEqual(1);
				expect(results.some((r) => r.id === route.id)).toBe(true);
			});

			it('returns empty array for map with no routes', async () => {
				const tx = db as unknown as TestTransaction;
				const emptyMap = await createMap(tx, { organization_id: testOrg1.id });
				createdMapIds.push(emptyMap.id);

				const results = await routeService.getRoutesByMap(
					emptyMap.id,
					testOrg1.id
				);

				expect(results).toHaveLength(0);
			});
		});

		describe('deleteRoute()', () => {
			it('removes route from database', async () => {
				const tx = db as unknown as TestTransaction;
				// Create a new driver to avoid unique constraint issues
				const newDriver = await createDriver(tx, {
					organization_id: testOrg1.id,
					active: true
				});
				createdDriverIds.push(newDriver.id);

				const route = await createRoute(tx, {
					organization_id: testOrg1.id,
					map_id: testMap1.id,
					driver_id: newDriver.id,
					depot_id: testDepot1.id
				});
				// Don't track route - we're deleting it

				await routeService.deleteRoute(route.id, testOrg1.id);

				try {
					await routeService.getRouteById(route.id, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});
		});
	});

	describe('Tenancy Isolation', () => {
		it('throws FORBIDDEN when accessing route from another org', async () => {
			const tx = db as unknown as TestTransaction;

			// Create route in org2
			const route2 = await createRoute(tx, {
				organization_id: testOrg2.id,
				map_id: testMap2.id,
				driver_id: testDriver2.id,
				depot_id: testDepot2.id
			});
			createdRouteIds.push(route2.id);

			// Try to access org2's route from org1
			try {
				await routeService.getRouteById(route2.id, testOrg1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('rejects upsert with cross-tenant map_id', async () => {
			try {
				await routeService.upsertRoute(
					{
						organization_id: testOrg1.id,
						map_id: testMap2.id, // Belongs to org2
						driver_id: testDriver1.id,
						depot_id: testDepot1.id,
						geometry: null,
						duration: undefined
					},
					testUser1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
				expect((error as ServiceError).message).toContain('Map');
			}
		});

		it('rejects upsert with cross-tenant driver_id', async () => {
			try {
				await routeService.upsertRoute(
					{
						organization_id: testOrg1.id,
						map_id: testMap1.id,
						driver_id: testDriver2.id, // Belongs to org2
						depot_id: testDepot1.id,
						geometry: null,
						duration: undefined
					},
					testUser1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
				expect((error as ServiceError).message).toContain('Driver');
			}
		});

		it('rejects upsert with cross-tenant depot_id', async () => {
			try {
				await routeService.upsertRoute(
					{
						organization_id: testOrg1.id,
						map_id: testMap1.id,
						driver_id: testDriver1.id,
						depot_id: testDepot2.id, // Belongs to org2
						geometry: null,
						duration: undefined
					},
					testUser1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
				expect((error as ServiceError).message).toContain('Depot');
			}
		});
	});

	describe('Audit Trail', () => {
		it('sets created_by and updated_by on create', async () => {
			const result = await routeService.upsertRoute(
				{
					organization_id: testOrg1.id,
					map_id: testMap1.id,
					driver_id: testDriver1.id,
					depot_id: testDepot1.id,
					geometry: {
						type: 'LineString',
						coordinates: [[-81.95, 28.03]]
					},
					duration: 300
				},
				testUser1.id
			);
			createdRouteIds.push(result.id);

			expect(result.created_by).toBe(testUser1.id);
			expect(result.updated_by).toBe(testUser1.id);
		});

		it('updates updated_by on update', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a second user
			const testUser2 = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'member'
			});
			createdUserIds.push(testUser2.id);

			// Create route with user1
			const route = await routeService.upsertRoute(
				{
					organization_id: testOrg1.id,
					map_id: testMap1.id,
					driver_id: testDriver1.id,
					depot_id: testDepot1.id,
					geometry: { type: 'LineString', coordinates: [[-81.95, 28.03]] },
					duration: 300
				},
				testUser1.id
			);
			createdRouteIds.push(route.id);

			// Update with user2
			const updated = await routeService.upsertRoute(
				{
					organization_id: testOrg1.id,
					map_id: testMap1.id,
					driver_id: testDriver1.id,
					depot_id: testDepot1.id,
					geometry: { type: 'LineString', coordinates: [[-81.96, 28.04]] },
					duration: 600
				},
				testUser2.id
			);

			expect(updated.created_by).toBe(testUser1.id); // Should not change
			expect(updated.updated_by).toBe(testUser2.id); // Should be updated
		});
	});

	describe('getRouteByMapAndDriver()', () => {
		it('returns route for valid map/driver combination', async () => {
			const tx = db as unknown as TestTransaction;
			// Create a new driver to avoid unique constraint issues
			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(newDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				driver_id: newDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			const result = await routeService.getRouteByMapAndDriver(
				testMap1.id,
				newDriver.id,
				testOrg1.id
			);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(route.id);
		});

		it('returns null when no route exists', async () => {
			const result = await routeService.getRouteByMapAndDriver(
				NON_EXISTENT_UUID,
				testDriver1.id,
				testOrg1.id
			);

			expect(result).toBeNull();
		});
	});

	describe('upsertRoutes()', () => {
		it('creates multiple routes successfully', async () => {
			const tx = db as unknown as TestTransaction;

			// Create drivers for the batch
			const driver1 = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(driver1.id);

			const driver2 = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(driver2.id);

			const results = await routeService.upsertRoutes(
				[
					{
						organization_id: testOrg1.id,
						map_id: testMap1.id,
						driver_id: driver1.id,
						depot_id: testDepot1.id,
						geometry: { type: 'LineString', coordinates: [[-81.95, 28.03]] },
						duration: 300
					},
					{
						organization_id: testOrg1.id,
						map_id: testMap1.id,
						driver_id: driver2.id,
						depot_id: testDepot1.id,
						geometry: { type: 'LineString', coordinates: [[-81.96, 28.04]] },
						duration: 400
					}
				],
				testUser1.id
			);
			results.forEach((r) => createdRouteIds.push(r.id));

			expect(results).toHaveLength(2);
			expect(results[0].driver_id).toBe(driver1.id);
			expect(results[1].driver_id).toBe(driver2.id);
		});

		it('returns empty array for empty input', async () => {
			const results = await routeService.upsertRoutes([], testUser1.id);
			expect(results).toHaveLength(0);
		});
	});

	describe('getRoutes()', () => {
		it('returns all routes for an organization', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new map and driver for isolation
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdMapIds.push(newMap.id);

			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(newDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				driver_id: newDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			const results = await routeService.getRoutes(testOrg1.id);

			expect(results.length).toBeGreaterThanOrEqual(1);
			expect(results.some((r) => r.id === route.id)).toBe(true);
		});

		it('does not return routes from other organizations', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new driver in org2 to avoid unique constraint
			const newDriver2 = await createDriver(tx, {
				organization_id: testOrg2.id,
				active: true
			});
			createdDriverIds.push(newDriver2.id);

			// Create route in org2
			const route2 = await createRoute(tx, {
				organization_id: testOrg2.id,
				map_id: testMap2.id,
				driver_id: newDriver2.id,
				depot_id: testDepot2.id
			});
			createdRouteIds.push(route2.id);

			// Query org1 routes
			const results = await routeService.getRoutes(testOrg1.id);

			// Should not contain org2's route
			expect(results.some((r) => r.id === route2.id)).toBe(false);
		});
	});

	describe('deleteRoutesByMap()', () => {
		it('deletes all routes for a map', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new map
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdMapIds.push(newMap.id);

			// Create drivers and routes for the map
			const driver1 = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(driver1.id);

			const driver2 = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(driver2.id);

			await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				driver_id: driver1.id,
				depot_id: testDepot1.id
			});
			// Don't track - we're deleting

			await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				driver_id: driver2.id,
				depot_id: testDepot1.id
			});
			// Don't track - we're deleting

			// Delete all routes for the map
			await routeService.deleteRoutesByMap(newMap.id, testOrg1.id);

			// Verify no routes remain
			const results = await routeService.getRoutesByMap(newMap.id, testOrg1.id);
			expect(results).toHaveLength(0);
		});

		it('only deletes routes for the specified map', async () => {
			const tx = db as unknown as TestTransaction;

			// Create two maps
			const map1 = await createMap(tx, { organization_id: testOrg1.id });
			createdMapIds.push(map1.id);

			const map2 = await createMap(tx, { organization_id: testOrg1.id });
			createdMapIds.push(map2.id);

			// Create drivers
			const driver1 = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(driver1.id);

			const driver2 = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(driver2.id);

			// Create route for map1
			await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: map1.id,
				driver_id: driver1.id,
				depot_id: testDepot1.id
			});
			// Don't track - we're deleting

			// Create route for map2
			const route2 = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: map2.id,
				driver_id: driver2.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route2.id);

			// Delete routes for map1 only
			await routeService.deleteRoutesByMap(map1.id, testOrg1.id);

			// Verify map1 routes are deleted
			const map1Routes = await routeService.getRoutesByMap(
				map1.id,
				testOrg1.id
			);
			expect(map1Routes).toHaveLength(0);

			// Verify map2 routes still exist
			const map2Routes = await routeService.getRoutesByMap(
				map2.id,
				testOrg1.id
			);
			expect(map2Routes).toHaveLength(1);
		});
	});

	describe('getPublicRoute()', () => {
		it('returns route when driver is temporary', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a temporary driver
			const tempDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true,
				temporary: true
			});
			createdDriverIds.push(tempDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				driver_id: tempDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			const result = await routeService.getPublicRoute(route.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(route.id);
		});

		it('returns null when driver is not temporary', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a non-temporary driver
			const normalDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true,
				temporary: false
			});
			createdDriverIds.push(normalDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				driver_id: normalDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			const result = await routeService.getPublicRoute(route.id);

			expect(result).toBeNull();
		});

		it('returns null for non-existent route', async () => {
			const result = await routeService.getPublicRoute(NON_EXISTENT_UUID);
			expect(result).toBeNull();
		});
	});

	describe('getDriverForUser()', () => {
		it('returns driver record when user is linked', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a user
			const driverUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'driver'
			});
			createdUserIds.push(driverUser.id);

			// Create driver linked to user
			const driver = await createDriver(tx, {
				organization_id: testOrg1.id,
				user_id: driverUser.id,
				active: true
			});
			createdDriverIds.push(driver.id);

			const result = await routeService.getDriverForUser(
				driverUser.id,
				testOrg1.id
			);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(driver.id);
		});

		it('returns null when user has no linked driver', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a user without a linked driver
			const regularUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'member'
			});
			createdUserIds.push(regularUser.id);

			const result = await routeService.getDriverForUser(
				regularUser.id,
				testOrg1.id
			);

			expect(result).toBeNull();
		});

		it('returns null when querying wrong organization', async () => {
			const tx = db as unknown as TestTransaction;

			// Create user and driver in org1
			const driverUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'driver'
			});
			createdUserIds.push(driverUser.id);

			const driver = await createDriver(tx, {
				organization_id: testOrg1.id,
				user_id: driverUser.id,
				active: true
			});
			createdDriverIds.push(driver.id);

			// Query with org2 - should return null
			const result = await routeService.getDriverForUser(
				driverUser.id,
				testOrg2.id
			);

			expect(result).toBeNull();
		});
	});

	describe('getRoutesForUser()', () => {
		it('returns all routes for admin user', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a map and routes
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdMapIds.push(newMap.id);

			const driver1 = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(driver1.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				driver_id: driver1.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			// Create admin user
			const adminUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'admin'
			});
			createdUserIds.push(adminUser.id);

			const results = await routeService.getRoutesForUser(adminUser);

			expect(results.length).toBeGreaterThanOrEqual(1);
			expect(results.some((r) => r.id === route.id)).toBe(true);
		});

		it('returns only assigned routes for driver user', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a map
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdMapIds.push(newMap.id);

			// Create driver user
			const driverUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'driver'
			});
			createdUserIds.push(driverUser.id);

			// Create driver linked to user
			const linkedDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				user_id: driverUser.id,
				active: true
			});
			createdDriverIds.push(linkedDriver.id);

			// Create another driver not linked to user
			const otherDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(otherDriver.id);

			// Create route for linked driver
			const linkedRoute = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				driver_id: linkedDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(linkedRoute.id);

			// Create route for other driver
			const otherRoute = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				driver_id: otherDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(otherRoute.id);

			const results = await routeService.getRoutesForUser(driverUser);

			// Should only contain the linked driver's route
			expect(results.some((r) => r.id === linkedRoute.id)).toBe(true);
			expect(results.some((r) => r.id === otherRoute.id)).toBe(false);
		});

		it('returns empty array for driver user without linked driver', async () => {
			const tx = db as unknown as TestTransaction;

			// Create driver user without linked driver record
			const driverUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'driver'
			});
			createdUserIds.push(driverUser.id);

			const results = await routeService.getRoutesForUser(driverUser);

			expect(results).toHaveLength(0);
		});
	});

	describe('getRouteByIdForUser()', () => {
		it('allows admin to access any org route', async () => {
			const tx = db as unknown as TestTransaction;

			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(newDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				driver_id: newDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			const result = await routeService.getRouteByIdForUser(
				route.id,
				testUser1
			);

			expect(result.id).toBe(route.id);
		});

		it('allows driver to access their own route', async () => {
			const tx = db as unknown as TestTransaction;

			// Create driver user
			const driverUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'driver'
			});
			createdUserIds.push(driverUser.id);

			// Create driver linked to user
			const linkedDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				user_id: driverUser.id,
				active: true
			});
			createdDriverIds.push(linkedDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				driver_id: linkedDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			const result = await routeService.getRouteByIdForUser(
				route.id,
				driverUser
			);

			expect(result.id).toBe(route.id);
		});

		it('throws FORBIDDEN when driver accesses another drivers route', async () => {
			const tx = db as unknown as TestTransaction;

			// Create driver user
			const driverUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'driver'
			});
			createdUserIds.push(driverUser.id);

			// Create driver linked to user
			const linkedDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				user_id: driverUser.id,
				active: true
			});
			createdDriverIds.push(linkedDriver.id);

			// Create another driver's route
			const otherDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(otherDriver.id);

			const otherRoute = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				driver_id: otherDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(otherRoute.id);

			try {
				await routeService.getRouteByIdForUser(otherRoute.id, driverUser);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('throws FORBIDDEN when driver has no linked driver record', async () => {
			const tx = db as unknown as TestTransaction;

			// Create driver user without linked driver
			const driverUser = await createUser(tx, {
				organization_id: testOrg1.id,
				role: 'driver'
			});
			createdUserIds.push(driverUser.id);

			// Create a route
			const someDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(someDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				driver_id: someDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			try {
				await routeService.getRouteByIdForUser(route.id, driverUser);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	describe('getRouteWithDetails()', () => {
		it('returns route with all related details', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new map for isolation
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdMapIds.push(newMap.id);

			const newDriver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdDriverIds.push(newDriver.id);

			const route = await createRoute(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				driver_id: newDriver.id,
				depot_id: testDepot1.id
			});
			createdRouteIds.push(route.id);

			// Create a stop for the route
			const stopLocation = await createLocation(tx, {
				organization_id: testOrg1.id
			});
			createdLocationIds.push(stopLocation.id);

			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: stopLocation.id,
				driver_id: newDriver.id,
				delivery_index: 0
			});
			createdStopIds.push(stop.id);

			const result = await routeService.getRouteWithDetails(
				route.id,
				testOrg1.id
			);

			expect(result.route.id).toBe(route.id);
			expect(result.map.id).toBe(newMap.id);
			expect(result.driver.id).toBe(newDriver.id);
			expect(result.depot.depot.id).toBe(testDepot1.id);
			expect(result.depot.location).toBeDefined();
			expect(result.stops).toHaveLength(1);
			expect(result.stops[0].stop.id).toBe(stop.id);
		});

		it('throws NOT_FOUND for non-existent route', async () => {
			try {
				await routeService.getRouteWithDetails(NON_EXISTENT_UUID, testOrg1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});
});
