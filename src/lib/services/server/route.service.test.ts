import { db } from '$lib/server/db';
import {
	depots,
	drivers,
	locations,
	maps,
	organizations,
	routes,
	users
} from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createOrganization,
	createRoute,
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
let testUser1: { id: string };
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
});
