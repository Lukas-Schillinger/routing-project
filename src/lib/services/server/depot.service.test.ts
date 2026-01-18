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
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { depotService } from './depot.service';
import { ServiceError } from './errors';

/**
 * Depot Service Tests
 *
 * Tests cover:
 * - CRUD operations
 * - Default depot management (unsetDefaultDepot)
 * - Tenancy isolation
 * - Audit trail fields
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

// Test fixtures - org1
let testOrg1: { id: string };
let testUser1: { id: string };
let testLocation1: { id: string };

// Test fixtures - org2 (for tenancy tests)
let testOrg2: { id: string };
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
	testOrg1 = await createOrganization(tx, { name: 'Depot Test Org 1' });
	createdOrgIds.push(testOrg1.id);

	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin'
	});
	createdUserIds.push(testUser1.id);

	testLocation1 = await createLocation(tx, { organization_id: testOrg1.id });
	createdLocationIds.push(testLocation1.id);

	// Create org2 for cross-tenant tests
	testOrg2 = await createOrganization(tx, { name: 'Depot Test Org 2' });
	createdOrgIds.push(testOrg2.id);

	testLocation2 = await createLocation(tx, { organization_id: testOrg2.id });
	createdLocationIds.push(testLocation2.id);
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

describe('DepotService', () => {
	describe('CRUD Operations', () => {
		describe('createDepot()', () => {
			it('creates depot with provided location', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const result = await depotService.createDepot(
					{
						name: 'Test Depot',
						location_id: loc.id,
						default_depot: false
					},
					testOrg1.id,
					testUser1.id
				);
				createdDepotIds.push(result.depot.id);

				expect(result.depot.name).toBe('Test Depot');
				expect(result.depot.location_id).toBe(loc.id);
				expect(result.location).toBeDefined();
			});

			it('sets audit fields on create', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const result = await depotService.createDepot(
					{
						name: 'Audit Test Depot',
						location_id: loc.id,
						default_depot: false
					},
					testOrg1.id,
					testUser1.id
				);
				createdDepotIds.push(result.depot.id);

				expect(result.depot.created_by).toBe(testUser1.id);
				expect(result.depot.updated_by).toBe(testUser1.id);
			});
		});

		describe('getDepots()', () => {
			it('returns all depots for an organization', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const depot = await createDepot(tx, {
					organization_id: testOrg1.id,
					location_id: loc.id
				});
				createdDepotIds.push(depot.id);

				const results = await depotService.getDepots(testOrg1.id);

				expect(results.length).toBeGreaterThanOrEqual(1);
				expect(results.some((r) => r.depot.id === depot.id)).toBe(true);
			});
		});

		describe('getDepotById()', () => {
			it('returns depot when found', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const depot = await createDepot(tx, {
					organization_id: testOrg1.id,
					location_id: loc.id
				});
				createdDepotIds.push(depot.id);

				const result = await depotService.getDepotById(depot.id, testOrg1.id);

				expect(result.depot.id).toBe(depot.id);
			});

			it('throws NOT_FOUND for non-existent depot', async () => {
				try {
					await depotService.getDepotById(NON_EXISTENT_UUID, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});

			it('throws FORBIDDEN for depot in different organization', async () => {
				const tx = db as unknown as TestTransaction;

				const depot2 = await createDepot(tx, {
					organization_id: testOrg2.id,
					location_id: testLocation2.id
				});
				createdDepotIds.push(depot2.id);

				try {
					await depotService.getDepotById(depot2.id, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('FORBIDDEN');
				}
			});
		});

		describe('updateDepot()', () => {
			it('updates depot name', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const depot = await createDepot(tx, {
					organization_id: testOrg1.id,
					location_id: loc.id,
					name: 'Original Name'
				});
				createdDepotIds.push(depot.id);

				const result = await depotService.updateDepot(
					depot.id,
					{ name: 'Updated Name' },
					testOrg1.id,
					testUser1.id
				);

				expect(result.depot.name).toBe('Updated Name');
			});

			it('sets updated_by on update', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const secondUser = await createUser(tx, {
					organization_id: testOrg1.id,
					role: 'member'
				});
				createdUserIds.push(secondUser.id);

				const depot = await createDepot(tx, {
					organization_id: testOrg1.id,
					location_id: loc.id,
					created_by: testUser1.id,
					updated_by: testUser1.id
				});
				createdDepotIds.push(depot.id);

				const result = await depotService.updateDepot(
					depot.id,
					{ name: 'New Name' },
					testOrg1.id,
					secondUser.id
				);

				expect(result.depot.updated_by).toBe(secondUser.id);
			});
		});

		describe('deleteDepot()', () => {
			it('deletes depot successfully', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const depot = await createDepot(tx, {
					organization_id: testOrg1.id,
					location_id: loc.id
				});
				// Don't track - we're deleting

				const result = await depotService.deleteDepot(depot.id, testOrg1.id);

				expect(result.success).toBe(true);

				// Verify deleted
				try {
					await depotService.getDepotById(depot.id, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('NOT_FOUND');
				}
			});

			it('throws VALIDATION when depot is used in routes', async () => {
				const tx = db as unknown as TestTransaction;
				const loc = await createLocation(tx, {
					organization_id: testOrg1.id
				});
				createdLocationIds.push(loc.id);

				const depot = await createDepot(tx, {
					organization_id: testOrg1.id,
					location_id: loc.id
				});
				createdDepotIds.push(depot.id);

				// Create map and driver
				const map = await createMap(tx, { organization_id: testOrg1.id });
				createdMapIds.push(map.id);

				const driver = await createDriver(tx, {
					organization_id: testOrg1.id,
					active: true
				});
				createdDriverIds.push(driver.id);

				// Create route using the depot
				const route = await createRoute(tx, {
					organization_id: testOrg1.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});
				createdRouteIds.push(route.id);

				try {
					await depotService.deleteDepot(depot.id, testOrg1.id);
					expect.fail('Should have thrown');
				} catch (error) {
					expect(error).toBeInstanceOf(ServiceError);
					expect((error as ServiceError).code).toBe('VALIDATION');
				}
			});
		});
	});

	describe('Default Depot Management (unsetDefaultDepot)', () => {
		it('unsets other default depots when creating a new default depot', async () => {
			const tx = db as unknown as TestTransaction;

			// Create locations
			const loc1 = await createLocation(tx, { organization_id: testOrg1.id });
			const loc2 = await createLocation(tx, { organization_id: testOrg1.id });
			createdLocationIds.push(loc1.id, loc2.id);

			// Create first depot as default
			const depot1 = await depotService.createDepot(
				{
					name: 'First Default Depot',
					location_id: loc1.id,
					default_depot: true
				},
				testOrg1.id,
				testUser1.id
			);
			createdDepotIds.push(depot1.depot.id);

			expect(depot1.depot.default_depot).toBe(true);

			// Create second depot as default - should unset first
			const depot2 = await depotService.createDepot(
				{
					name: 'Second Default Depot',
					location_id: loc2.id,
					default_depot: true
				},
				testOrg1.id,
				testUser1.id
			);
			createdDepotIds.push(depot2.depot.id);

			expect(depot2.depot.default_depot).toBe(true);

			// Verify first depot is no longer default
			const [updatedDepot1] = await db
				.select()
				.from(depots)
				.where(eq(depots.id, depot1.depot.id))
				.limit(1);

			expect(updatedDepot1.default_depot).toBe(false);
		});

		it('unsets other default depots when updating a depot to default', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a fresh org for this test to avoid conflicts
			const testOrg = await createOrganization(tx, {
				name: 'Update Default Test Org'
			});
			createdOrgIds.push(testOrg.id);

			const testUser = await createUser(tx, {
				organization_id: testOrg.id,
				role: 'admin'
			});
			createdUserIds.push(testUser.id);

			// Create locations
			const loc1 = await createLocation(tx, { organization_id: testOrg.id });
			const loc2 = await createLocation(tx, { organization_id: testOrg.id });
			createdLocationIds.push(loc1.id, loc2.id);

			// Create first depot as default using service (respects constraints)
			const depot1 = await depotService.createDepot(
				{
					name: 'First Depot',
					location_id: loc1.id,
					default_depot: true
				},
				testOrg.id,
				testUser.id
			);
			createdDepotIds.push(depot1.depot.id);

			// Create second depot as non-default
			const depot2 = await depotService.createDepot(
				{
					name: 'Second Depot',
					location_id: loc2.id,
					default_depot: false
				},
				testOrg.id,
				testUser.id
			);
			createdDepotIds.push(depot2.depot.id);

			// Update second depot to be default
			const result = await depotService.updateDepot(
				depot2.depot.id,
				{ default_depot: true },
				testOrg.id,
				testUser.id
			);

			expect(result.depot.default_depot).toBe(true);

			// Verify first depot is no longer default
			const [updatedDepot1] = await db
				.select()
				.from(depots)
				.where(eq(depots.id, depot1.depot.id))
				.limit(1);

			expect(updatedDepot1.default_depot).toBe(false);
		});

		it('only affects depots in the same organization', async () => {
			const tx = db as unknown as TestTransaction;

			// Create user for org2
			const user2 = await createUser(tx, {
				organization_id: testOrg2.id,
				role: 'admin'
			});
			createdUserIds.push(user2.id);

			// Create locations
			const loc1 = await createLocation(tx, { organization_id: testOrg1.id });
			const loc2 = await createLocation(tx, { organization_id: testOrg2.id });
			createdLocationIds.push(loc1.id, loc2.id);

			// Create default depot in org1
			const depot1 = await depotService.createDepot(
				{
					name: 'Org1 Default Depot',
					location_id: loc1.id,
					default_depot: true
				},
				testOrg1.id,
				testUser1.id
			);
			createdDepotIds.push(depot1.depot.id);

			// Create default depot in org2
			const depot2 = await depotService.createDepot(
				{
					name: 'Org2 Default Depot',
					location_id: loc2.id,
					default_depot: true
				},
				testOrg2.id,
				user2.id
			);
			createdDepotIds.push(depot2.depot.id);

			// Verify org1's depot is still default (not affected by org2)
			const [org1Depot] = await db
				.select()
				.from(depots)
				.where(eq(depots.id, depot1.depot.id))
				.limit(1);

			expect(org1Depot.default_depot).toBe(true);

			// Verify org2's depot is also default
			const [org2Depot] = await db
				.select()
				.from(depots)
				.where(eq(depots.id, depot2.depot.id))
				.limit(1);

			expect(org2Depot.default_depot).toBe(true);
		});

		it('preserves other depot properties when unsetting default', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a fresh org for this test to avoid conflicts
			const testOrg = await createOrganization(tx, {
				name: 'Preserve Props Test Org'
			});
			createdOrgIds.push(testOrg.id);

			const testUser = await createUser(tx, {
				organization_id: testOrg.id,
				role: 'admin'
			});
			createdUserIds.push(testUser.id);

			// Create locations
			const loc1 = await createLocation(tx, { organization_id: testOrg.id });
			const loc2 = await createLocation(tx, { organization_id: testOrg.id });
			createdLocationIds.push(loc1.id, loc2.id);

			// Create first depot as default with specific name using service
			const depot1 = await depotService.createDepot(
				{
					name: 'Original Depot Name',
					location_id: loc1.id,
					default_depot: true
				},
				testOrg.id,
				testUser.id
			);
			createdDepotIds.push(depot1.depot.id);

			const originalCreatedAt = depot1.depot.created_at;
			const originalCreatedBy = depot1.depot.created_by;
			const originalName = depot1.depot.name;

			// Create second depot as default - will unset first
			const depot2 = await depotService.createDepot(
				{
					name: 'New Default Depot',
					location_id: loc2.id,
					default_depot: true
				},
				testOrg.id,
				testUser.id
			);
			createdDepotIds.push(depot2.depot.id);

			// Verify first depot's other properties are preserved
			const [updatedDepot1] = await db
				.select()
				.from(depots)
				.where(eq(depots.id, depot1.depot.id))
				.limit(1);

			expect(updatedDepot1.name).toBe(originalName);
			expect(updatedDepot1.location_id).toBe(loc1.id);
			expect(updatedDepot1.created_by).toBe(originalCreatedBy);
			expect(updatedDepot1.created_at?.getTime()).toBe(
				originalCreatedAt?.getTime()
			);
			expect(updatedDepot1.default_depot).toBe(false);
		});
	});
});
