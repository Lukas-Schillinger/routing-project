import {
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createRoute,
	createStop,
	createTestEnvironment,
	createUser,
	withTestTransaction
} from '$lib/testing';
import { describe, expect, it } from 'vitest';
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

/**
 * Creates a complete route test setup with two organizations for tenancy testing.
 */
async function createRouteTestSetup() {
	const { organization: org1, user: user1 } = await createTestEnvironment();

	const location1 = await createLocation({ organization_id: org1.id });
	const map1 = await createMap({ organization_id: org1.id });
	const driver1 = await createDriver({
		organization_id: org1.id,
		active: true
	});
	const depot1 = await createDepot({
		organization_id: org1.id,
		location_id: location1.id,
		default_depot: true
	});

	// Create second org for cross-tenant tests
	const { organization: org2 } = await createTestEnvironment();

	const location2 = await createLocation({ organization_id: org2.id });
	const map2 = await createMap({ organization_id: org2.id });
	const driver2 = await createDriver({
		organization_id: org2.id,
		active: true
	});
	const depot2 = await createDepot({
		organization_id: org2.id,
		location_id: location2.id,
		default_depot: true
	});

	return {
		org1,
		user1,
		location1,
		map1,
		driver1,
		depot1,
		org2,
		location2,
		map2,
		driver2,
		depot2
	};
}

describe('RouteService', () => {
	describe('CRUD Operations', () => {
		describe('upsertRoute()', () => {
			it('creates new route when none exists', async () => {
				await withTestTransaction(async () => {
					const { org1, user1, map1, driver1, depot1 } =
						await createRouteTestSetup();

					const result = await routeService.upsertRoute(
						{
							organization_id: org1.id,
							map_id: map1.id,
							driver_id: driver1.id,
							depot_id: depot1.id,
							geometry: {
								type: 'LineString',
								coordinates: [
									[-81.95, 28.03],
									[-81.96, 28.04]
								]
							},
							duration: 600
						},
						user1.id
					);

					expect(result.id).toBeDefined();
					expect(result.organization_id).toBe(org1.id);
					expect(result.map_id).toBe(map1.id);
					expect(result.driver_id).toBe(driver1.id);
					expect(result.depot_id).toBe(depot1.id);
				});
			});

			it('updates existing route for same map/driver', async () => {
				await withTestTransaction(async () => {
					const { org1, user1, map1, driver1, depot1 } =
						await createRouteTestSetup();

					const initial = await routeService.upsertRoute(
						{
							organization_id: org1.id,
							map_id: map1.id,
							driver_id: driver1.id,
							depot_id: depot1.id,
							geometry: {
								type: 'LineString',
								coordinates: [[-81.95, 28.03]]
							},
							duration: 600
						},
						user1.id
					);

					const updated = await routeService.upsertRoute(
						{
							organization_id: org1.id,
							map_id: map1.id,
							driver_id: driver1.id,
							depot_id: depot1.id,
							geometry: {
								type: 'LineString',
								coordinates: [
									[-81.96, 28.04],
									[-81.97, 28.05]
								]
							},
							duration: 900
						},
						user1.id
					);

					expect(updated.id).toBe(initial.id);
					expect(parseFloat(updated.duration!)).toBe(900);
				});
			});
		});

		describe('getRouteById()', () => {
			it('returns route when found', async () => {
				await withTestTransaction(async () => {
					const { org1, map1, depot1 } = await createRouteTestSetup();

					const newDriver = await createDriver({
						organization_id: org1.id,
						active: true
					});

					const route = await createRoute({
						organization_id: org1.id,
						map_id: map1.id,
						driver_id: newDriver.id,
						depot_id: depot1.id
					});

					const result = await routeService.getRouteById(route.id, org1.id);

					expect(result.id).toBe(route.id);
					expect(result.organization_id).toBe(org1.id);
				});
			});

			it('throws NOT_FOUND for non-existent route', async () => {
				await withTestTransaction(async () => {
					const { org1 } = await createRouteTestSetup();

					await expect(
						routeService.getRouteById(NON_EXISTENT_UUID, org1.id)
					).rejects.toMatchObject({
						code: 'NOT_FOUND'
					});
				});
			});
		});

		describe('getRoutesByMap()', () => {
			it('returns all routes for a map', async () => {
				await withTestTransaction(async () => {
					const { org1, map1, depot1 } = await createRouteTestSetup();

					const newDriver = await createDriver({
						organization_id: org1.id,
						active: true
					});

					const route = await createRoute({
						organization_id: org1.id,
						map_id: map1.id,
						driver_id: newDriver.id,
						depot_id: depot1.id
					});

					const results = await routeService.getRoutesByMap(map1.id, org1.id);

					expect(results.length).toBeGreaterThanOrEqual(1);
					expect(results.some((r) => r.id === route.id)).toBe(true);
				});
			});

			it('returns empty array for map with no routes', async () => {
				await withTestTransaction(async () => {
					const { org1 } = await createRouteTestSetup();

					const emptyMap = await createMap({ organization_id: org1.id });

					const results = await routeService.getRoutesByMap(
						emptyMap.id,
						org1.id
					);

					expect(results).toHaveLength(0);
				});
			});
		});

		describe('deleteRoute()', () => {
			it('removes route from database', async () => {
				await withTestTransaction(async () => {
					const { org1, map1, depot1 } = await createRouteTestSetup();

					const newDriver = await createDriver({
						organization_id: org1.id,
						active: true
					});

					const route = await createRoute({
						organization_id: org1.id,
						map_id: map1.id,
						driver_id: newDriver.id,
						depot_id: depot1.id
					});

					await routeService.deleteRoute(route.id, org1.id);

					await expect(
						routeService.getRouteById(route.id, org1.id)
					).rejects.toMatchObject({
						code: 'NOT_FOUND'
					});
				});
			});
		});
	});

	describe('Tenancy Isolation', () => {
		it('throws NOT_FOUND when accessing route from another org', async () => {
			await withTestTransaction(async () => {
				const { org1, org2, map2, driver2, depot2 } =
					await createRouteTestSetup();

				const route2 = await createRoute({
					organization_id: org2.id,
					map_id: map2.id,
					driver_id: driver2.id,
					depot_id: depot2.id
				});

				await expect(
					routeService.getRouteById(route2.id, org1.id)
				).rejects.toMatchObject({
					code: 'NOT_FOUND'
				});
			});
		});

		it('rejects upsert with cross-tenant map_id', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, driver1, depot1, map2 } =
					await createRouteTestSetup();

				await expect(
					routeService.upsertRoute(
						{
							organization_id: org1.id,
							map_id: map2.id, // Belongs to org2
							driver_id: driver1.id,
							depot_id: depot1.id,
							geometry: null,
							duration: undefined
						},
						user1.id
					)
				).rejects.toMatchObject({
					code: 'FORBIDDEN',
					message: expect.stringContaining('Map')
				});
			});
		});

		it('rejects upsert with cross-tenant driver_id', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map1, depot1, driver2 } =
					await createRouteTestSetup();

				await expect(
					routeService.upsertRoute(
						{
							organization_id: org1.id,
							map_id: map1.id,
							driver_id: driver2.id, // Belongs to org2
							depot_id: depot1.id,
							geometry: null,
							duration: undefined
						},
						user1.id
					)
				).rejects.toMatchObject({
					code: 'FORBIDDEN',
					message: expect.stringContaining('Driver')
				});
			});
		});

		it('rejects upsert with cross-tenant depot_id', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map1, driver1, depot2 } =
					await createRouteTestSetup();

				await expect(
					routeService.upsertRoute(
						{
							organization_id: org1.id,
							map_id: map1.id,
							driver_id: driver1.id,
							depot_id: depot2.id, // Belongs to org2
							geometry: null,
							duration: undefined
						},
						user1.id
					)
				).rejects.toMatchObject({
					code: 'FORBIDDEN',
					message: expect.stringContaining('Depot')
				});
			});
		});
	});

	describe('Audit Trail', () => {
		it('sets created_by and updated_by on create', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map1, driver1, depot1 } =
					await createRouteTestSetup();

				const result = await routeService.upsertRoute(
					{
						organization_id: org1.id,
						map_id: map1.id,
						driver_id: driver1.id,
						depot_id: depot1.id,
						geometry: {
							type: 'LineString',
							coordinates: [[-81.95, 28.03]]
						},
						duration: 300
					},
					user1.id
				);

				expect(result.created_by).toBe(user1.id);
				expect(result.updated_by).toBe(user1.id);
			});
		});

		it('updates updated_by on update', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map1, driver1, depot1 } =
					await createRouteTestSetup();

				const user2 = await createUser({
					organization_id: org1.id,
					role: 'member'
				});

				// Create initial route with user1
				await routeService.upsertRoute(
					{
						organization_id: org1.id,
						map_id: map1.id,
						driver_id: driver1.id,
						depot_id: depot1.id,
						geometry: { type: 'LineString', coordinates: [[-81.95, 28.03]] },
						duration: 300
					},
					user1.id
				);

				// Update with user2
				const updated = await routeService.upsertRoute(
					{
						organization_id: org1.id,
						map_id: map1.id,
						driver_id: driver1.id,
						depot_id: depot1.id,
						geometry: { type: 'LineString', coordinates: [[-81.96, 28.04]] },
						duration: 600
					},
					user2.id
				);

				expect(updated.created_by).toBe(user1.id); // Should not change
				expect(updated.updated_by).toBe(user2.id); // Should be updated
			});
		});
	});

	describe('getRouteByMapAndDriver()', () => {
		it('returns route for valid map/driver combination', async () => {
			await withTestTransaction(async () => {
				const { org1, map1, depot1 } = await createRouteTestSetup();

				const newDriver = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: newDriver.id,
					depot_id: depot1.id
				});

				const result = await routeService.getRouteByMapAndDriver(
					map1.id,
					newDriver.id,
					org1.id
				);

				expect(result).not.toBeNull();
				expect(result?.id).toBe(route.id);
			});
		});

		it('returns null when no route exists', async () => {
			await withTestTransaction(async () => {
				const { org1, driver1 } = await createRouteTestSetup();

				const result = await routeService.getRouteByMapAndDriver(
					NON_EXISTENT_UUID,
					driver1.id,
					org1.id
				);

				expect(result).toBeNull();
			});
		});
	});

	describe('getRoutes()', () => {
		it('returns all routes for an organization', async () => {
			await withTestTransaction(async () => {
				const { org1, depot1 } = await createRouteTestSetup();

				const newMap = await createMap({ organization_id: org1.id });

				const newDriver = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: newMap.id,
					driver_id: newDriver.id,
					depot_id: depot1.id
				});

				const results = await routeService.getRoutes(org1.id);

				expect(results.length).toBeGreaterThanOrEqual(1);
				expect(results.some((r) => r.id === route.id)).toBe(true);
			});
		});

		it('does not return routes from other organizations', async () => {
			await withTestTransaction(async () => {
				const { org1, org2, map2, depot2 } = await createRouteTestSetup();

				const newDriver2 = await createDriver({
					organization_id: org2.id,
					active: true
				});

				const route2 = await createRoute({
					organization_id: org2.id,
					map_id: map2.id,
					driver_id: newDriver2.id,
					depot_id: depot2.id
				});

				const results = await routeService.getRoutes(org1.id);

				expect(results.some((r) => r.id === route2.id)).toBe(false);
			});
		});
	});

	describe('deleteRoutesByMap()', () => {
		it('deletes all routes for a map', async () => {
			await withTestTransaction(async () => {
				const { org1, depot1 } = await createRouteTestSetup();

				const newMap = await createMap({ organization_id: org1.id });

				const driver1 = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const driver2 = await createDriver({
					organization_id: org1.id,
					active: true
				});

				await createRoute({
					organization_id: org1.id,
					map_id: newMap.id,
					driver_id: driver1.id,
					depot_id: depot1.id
				});

				await createRoute({
					organization_id: org1.id,
					map_id: newMap.id,
					driver_id: driver2.id,
					depot_id: depot1.id
				});

				await routeService.deleteRoutesByMap(newMap.id, org1.id);

				const results = await routeService.getRoutesByMap(newMap.id, org1.id);
				expect(results).toHaveLength(0);
			});
		});

		it('only deletes routes for the specified map', async () => {
			await withTestTransaction(async () => {
				const { org1, depot1 } = await createRouteTestSetup();

				const map1 = await createMap({ organization_id: org1.id });
				const map2 = await createMap({ organization_id: org1.id });

				const driver1 = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const driver2 = await createDriver({
					organization_id: org1.id,
					active: true
				});

				await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: driver1.id,
					depot_id: depot1.id
				});

				const route2 = await createRoute({
					organization_id: org1.id,
					map_id: map2.id,
					driver_id: driver2.id,
					depot_id: depot1.id
				});

				await routeService.deleteRoutesByMap(map1.id, org1.id);

				const map1Routes = await routeService.getRoutesByMap(map1.id, org1.id);
				expect(map1Routes).toHaveLength(0);

				const map2Routes = await routeService.getRoutesByMap(map2.id, org1.id);
				expect(map2Routes).toHaveLength(1);
				expect(map2Routes[0].id).toBe(route2.id);
			});
		});
	});

	describe('getPublicRoute()', () => {
		it('returns route when driver is temporary', async () => {
			await withTestTransaction(async () => {
				const { org1, map1, depot1 } = await createRouteTestSetup();

				const tempDriver = await createDriver({
					organization_id: org1.id,
					active: true,
					temporary: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: tempDriver.id,
					depot_id: depot1.id
				});

				const result = await routeService.getPublicRoute(route.id);

				expect(result).not.toBeNull();
				expect(result?.id).toBe(route.id);
			});
		});

		it('returns null when driver is not temporary', async () => {
			await withTestTransaction(async () => {
				const { org1, map1, depot1 } = await createRouteTestSetup();

				const normalDriver = await createDriver({
					organization_id: org1.id,
					active: true,
					temporary: false
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: normalDriver.id,
					depot_id: depot1.id
				});

				const result = await routeService.getPublicRoute(route.id);

				expect(result).toBeNull();
			});
		});

		it('returns null for non-existent route', async () => {
			await withTestTransaction(async () => {
				const result = await routeService.getPublicRoute(NON_EXISTENT_UUID);
				expect(result).toBeNull();
			});
		});
	});

	describe('getDriverForUser()', () => {
		it('returns driver record when user is linked', async () => {
			await withTestTransaction(async () => {
				const { org1 } = await createRouteTestSetup();

				const driverUser = await createUser({
					organization_id: org1.id,
					role: 'driver'
				});

				const driver = await createDriver({
					organization_id: org1.id,
					user_id: driverUser.id,
					active: true
				});

				const result = await routeService.getDriverForUser(
					driverUser.id,
					org1.id
				);

				expect(result).not.toBeNull();
				expect(result?.id).toBe(driver.id);
			});
		});

		it('returns null when user has no linked driver', async () => {
			await withTestTransaction(async () => {
				const { org1 } = await createRouteTestSetup();

				const regularUser = await createUser({
					organization_id: org1.id,
					role: 'member'
				});

				const result = await routeService.getDriverForUser(
					regularUser.id,
					org1.id
				);

				expect(result).toBeNull();
			});
		});

		it('returns null when querying wrong organization', async () => {
			await withTestTransaction(async () => {
				const { org1, org2 } = await createRouteTestSetup();

				const driverUser = await createUser({
					organization_id: org1.id,
					role: 'driver'
				});

				await createDriver({
					organization_id: org1.id,
					user_id: driverUser.id,
					active: true
				});

				const result = await routeService.getDriverForUser(
					driverUser.id,
					org2.id
				);

				expect(result).toBeNull();
			});
		});
	});

	describe('getRoutesForUser()', () => {
		it('returns all routes for admin user', async () => {
			await withTestTransaction(async () => {
				const { org1, depot1 } = await createRouteTestSetup();

				const newMap = await createMap({ organization_id: org1.id });

				const driver1 = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: newMap.id,
					driver_id: driver1.id,
					depot_id: depot1.id
				});

				const adminUser = await createUser({
					organization_id: org1.id,
					role: 'admin'
				});

				const results = await routeService.getRoutesForUser(adminUser);

				expect(results.length).toBeGreaterThanOrEqual(1);
				expect(results.some((r) => r.id === route.id)).toBe(true);
			});
		});

		it('returns only assigned routes for driver user', async () => {
			await withTestTransaction(async () => {
				const { org1, depot1 } = await createRouteTestSetup();

				const newMap = await createMap({ organization_id: org1.id });

				const driverUser = await createUser({
					organization_id: org1.id,
					role: 'driver'
				});

				const linkedDriver = await createDriver({
					organization_id: org1.id,
					user_id: driverUser.id,
					active: true
				});

				const otherDriver = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const linkedRoute = await createRoute({
					organization_id: org1.id,
					map_id: newMap.id,
					driver_id: linkedDriver.id,
					depot_id: depot1.id
				});

				const otherRoute = await createRoute({
					organization_id: org1.id,
					map_id: newMap.id,
					driver_id: otherDriver.id,
					depot_id: depot1.id
				});

				const results = await routeService.getRoutesForUser(driverUser);

				expect(results.some((r) => r.id === linkedRoute.id)).toBe(true);
				expect(results.some((r) => r.id === otherRoute.id)).toBe(false);
			});
		});

		it('returns empty array for driver user without linked driver', async () => {
			await withTestTransaction(async () => {
				const { org1 } = await createRouteTestSetup();

				const driverUser = await createUser({
					organization_id: org1.id,
					role: 'driver'
				});

				const results = await routeService.getRoutesForUser(driverUser);

				expect(results).toHaveLength(0);
			});
		});
	});

	describe('getRouteByIdForUser()', () => {
		it('allows admin to access any org route', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map1, depot1 } = await createRouteTestSetup();

				const newDriver = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: newDriver.id,
					depot_id: depot1.id
				});

				const result = await routeService.getRouteByIdForUser(route.id, user1);

				expect(result.id).toBe(route.id);
			});
		});

		it('allows driver to access their own route', async () => {
			await withTestTransaction(async () => {
				const { org1, map1, depot1 } = await createRouteTestSetup();

				const driverUser = await createUser({
					organization_id: org1.id,
					role: 'driver'
				});

				const linkedDriver = await createDriver({
					organization_id: org1.id,
					user_id: driverUser.id,
					active: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: linkedDriver.id,
					depot_id: depot1.id
				});

				const result = await routeService.getRouteByIdForUser(
					route.id,
					driverUser
				);

				expect(result.id).toBe(route.id);
			});
		});

		it('throws FORBIDDEN when driver accesses another drivers route', async () => {
			await withTestTransaction(async () => {
				const { org1, map1, depot1 } = await createRouteTestSetup();

				const driverUser = await createUser({
					organization_id: org1.id,
					role: 'driver'
				});

				await createDriver({
					organization_id: org1.id,
					user_id: driverUser.id,
					active: true
				});

				const otherDriver = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const otherRoute = await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: otherDriver.id,
					depot_id: depot1.id
				});

				await expect(
					routeService.getRouteByIdForUser(otherRoute.id, driverUser)
				).rejects.toMatchObject({
					code: 'FORBIDDEN'
				});
			});
		});

		it('throws FORBIDDEN when driver has no linked driver record', async () => {
			await withTestTransaction(async () => {
				const { org1, map1, depot1 } = await createRouteTestSetup();

				const driverUser = await createUser({
					organization_id: org1.id,
					role: 'driver'
				});

				const someDriver = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: map1.id,
					driver_id: someDriver.id,
					depot_id: depot1.id
				});

				await expect(
					routeService.getRouteByIdForUser(route.id, driverUser)
				).rejects.toMatchObject({
					code: 'FORBIDDEN'
				});
			});
		});
	});

	describe('getRouteWithDetails()', () => {
		it('returns route with all related details', async () => {
			await withTestTransaction(async () => {
				const { org1, depot1 } = await createRouteTestSetup();

				const newMap = await createMap({ organization_id: org1.id });

				const newDriver = await createDriver({
					organization_id: org1.id,
					active: true
				});

				const route = await createRoute({
					organization_id: org1.id,
					map_id: newMap.id,
					driver_id: newDriver.id,
					depot_id: depot1.id
				});

				const stopLocation = await createLocation({
					organization_id: org1.id
				});

				const stop = await createStop({
					organization_id: org1.id,
					map_id: newMap.id,
					location_id: stopLocation.id,
					driver_id: newDriver.id,
					delivery_index: 0
				});

				const result = await routeService.getRouteWithDetails(
					route.id,
					org1.id
				);

				expect(result.route.id).toBe(route.id);
				expect(result.map.id).toBe(newMap.id);
				expect(result.driver.id).toBe(newDriver.id);
				expect(result.depot.depot.id).toBe(depot1.id);
				expect(result.depot.location).toBeDefined();
				expect(result.stops).toHaveLength(1);
				expect(result.stops[0].stop.id).toBe(stop.id);
			});
		});

		it('throws NOT_FOUND for non-existent route', async () => {
			await withTestTransaction(async () => {
				const { org1 } = await createRouteTestSetup();

				await expect(
					routeService.getRouteWithDetails(NON_EXISTENT_UUID, org1.id)
				).rejects.toMatchObject({
					code: 'NOT_FOUND'
				});
			});
		});
	});
});
