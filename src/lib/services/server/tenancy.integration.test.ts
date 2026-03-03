/**
 * Multi-Tenancy Isolation Tests
 *
 * Verifies that all organization-scoped models enforce proper tenant isolation.
 * Creates 2 organizations with identical data structures and verifies complete
 * isolation across all CRUD operations.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */
import {
	createDepot,
	createDriver,
	createInvitation,
	createLocation,
	createMap,
	createRoute,
	createRouteShare,
	createStop,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { describe, expect, it } from 'vitest';
import { depotService } from './depot.service';
import { driverService } from './driver.service';
import { invitationService } from './invitation.service';
import { locationService } from './location.service';
import { mapService } from './map.service';
import { routeShareService } from './route-share.service';
import { routeService } from './route.service';
import { stopService } from './stop.service';
import { userService } from './user.service';

/**
 * Helper to create two organizations with identical data structures
 */
async function createTwoTenants() {
	// Create org1 with full data structure
	const { organization: org1, user: user1 } = await createTestEnvironment();
	const location1 = await createLocation({ organization_id: org1.id });
	const depot1 = await createDepot({
		organization_id: org1.id,
		location_id: location1.id
	});
	const map1 = await createMap({ organization_id: org1.id });
	const driver1 = await createDriver({ organization_id: org1.id });
	const stop1 = await createStop({
		organization_id: org1.id,
		map_id: map1.id,
		location_id: location1.id
	});
	const route1 = await createRoute({
		organization_id: org1.id,
		map_id: map1.id,
		driver_id: driver1.id,
		depot_id: depot1.id
	});
	const share1 = await createRouteShare({
		organization_id: org1.id,
		route_id: route1.id
	});
	const invitation1 = await createInvitation({
		organization_id: org1.id,
		created_by: user1.id
	});

	// Create org2 with same structure
	const { organization: org2, user: user2 } = await createTestEnvironment();
	const location2 = await createLocation({ organization_id: org2.id });
	const depot2 = await createDepot({
		organization_id: org2.id,
		location_id: location2.id
	});
	const map2 = await createMap({ organization_id: org2.id });
	const driver2 = await createDriver({ organization_id: org2.id });
	const stop2 = await createStop({
		organization_id: org2.id,
		map_id: map2.id,
		location_id: location2.id
	});
	const route2 = await createRoute({
		organization_id: org2.id,
		map_id: map2.id,
		driver_id: driver2.id,
		depot_id: depot2.id
	});
	const share2 = await createRouteShare({
		organization_id: org2.id,
		route_id: route2.id
	});
	const invitation2 = await createInvitation({
		organization_id: org2.id,
		created_by: user2.id
	});

	return {
		org1,
		org2,
		user1,
		user2,
		location1,
		location2,
		depot1,
		depot2,
		map1,
		map2,
		driver1,
		driver2,
		stop1,
		stop2,
		route1,
		route2,
		share1,
		share2,
		invitation1,
		invitation2
	};
}

describe('Multi-Tenancy Isolation Tests', () => {
	// ============================================================================
	// LocationService Isolation
	// ============================================================================
	describe('LocationService Isolation', () => {
		it('org A can read own location', async () => {
			await withTestTransaction(async () => {
				const { org1, location1 } = await createTwoTenants();

				const location = await locationService.getLocationById(
					location1.id,
					org1.id
				);
				expect(location.id).toBe(location1.id);
			});
		});

		it('org A cannot read org B locations - throws NOT_FOUND', async () => {
			await withTestTransaction(async () => {
				const { org1, location2 } = await createTwoTenants();

				await expect(
					locationService.getLocationById(location2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getLocations returns only own org locations', async () => {
			await withTestTransaction(async () => {
				const { org1, org2 } = await createTwoTenants();

				const locationsOrg1 = await locationService.getLocations(org1.id);
				const locationsOrg2 = await locationService.getLocations(org2.id);

				expect(locationsOrg1.every((l) => l.organization_id === org1.id)).toBe(
					true
				);
				expect(locationsOrg2.every((l) => l.organization_id === org2.id)).toBe(
					true
				);

				expect(locationsOrg1.length).toBeGreaterThanOrEqual(1);
				expect(locationsOrg2.length).toBeGreaterThanOrEqual(1);
			});
		});

		it('org A cannot delete org B locations', async () => {
			await withTestTransaction(async () => {
				const { org1, location2 } = await createTwoTenants();

				await expect(
					locationService.deleteLocation(location2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	// ============================================================================
	// DepotService Isolation
	// ============================================================================
	describe('DepotService Isolation', () => {
		it('org A can read own depot', async () => {
			await withTestTransaction(async () => {
				const { org1, depot1 } = await createTwoTenants();

				const result = await depotService.getDepotById(depot1.id, org1.id);
				expect(result.depot.id).toBe(depot1.id);
			});
		});

		it('org A cannot read org B depots - throws NOT_FOUND', async () => {
			await withTestTransaction(async () => {
				const { org1, depot2 } = await createTwoTenants();

				await expect(
					depotService.getDepotById(depot2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getDepots returns only own org depots', async () => {
			await withTestTransaction(async () => {
				const { org1, org2 } = await createTwoTenants();

				const depotsOrg1 = await depotService.getDepots(org1.id);
				const depotsOrg2 = await depotService.getDepots(org2.id);

				expect(
					depotsOrg1.every((d) => d.depot.organization_id === org1.id)
				).toBe(true);
				expect(
					depotsOrg2.every((d) => d.depot.organization_id === org2.id)
				).toBe(true);

				expect(depotsOrg1.length).toBeGreaterThanOrEqual(1);
				expect(depotsOrg2.length).toBeGreaterThanOrEqual(1);
			});
		});

		it('org A cannot update org B depots', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, depot2 } = await createTwoTenants();

				await expect(
					depotService.updateDepot(
						depot2.id,
						{ name: 'Hacked' },
						org1.id,
						user1.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('org A cannot delete org B depots', async () => {
			await withTestTransaction(async () => {
				const { org1, depot2 } = await createTwoTenants();

				await expect(
					depotService.deleteDepot(depot2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('cannot create depot with another org location', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, location2 } = await createTwoTenants();

				await expect(
					depotService.createDepot(
						{
							location_id: location2.id,
							name: 'Cross-tenant depot',
							default_depot: false
						},
						org1.id,
						user1.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	// ============================================================================
	// StopService Isolation
	// ============================================================================
	describe('StopService Isolation', () => {
		it('org A can read own stop', async () => {
			await withTestTransaction(async () => {
				const { org1, stop1 } = await createTwoTenants();

				const stop = await stopService.getStopById(stop1.id, org1.id);
				expect(stop.stop.id).toBe(stop1.id);
			});
		});

		it('org A cannot read org B stops - throws NOT_FOUND', async () => {
			await withTestTransaction(async () => {
				const { org1, stop2 } = await createTwoTenants();

				await expect(
					stopService.getStopById(stop2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getStops returns only own org stops', async () => {
			await withTestTransaction(async () => {
				const { org1, org2 } = await createTwoTenants();

				const stopsOrg1 = await stopService.getStops(org1.id);
				const stopsOrg2 = await stopService.getStops(org2.id);

				expect(stopsOrg1.every((s) => s.organization_id === org1.id)).toBe(
					true
				);
				expect(stopsOrg2.every((s) => s.organization_id === org2.id)).toBe(
					true
				);

				expect(stopsOrg1.length).toBeGreaterThanOrEqual(1);
				expect(stopsOrg2.length).toBeGreaterThanOrEqual(1);
			});
		});

		it('org A cannot update org B stops', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, stop2 } = await createTwoTenants();

				await expect(
					stopService.updateStop(
						stop2.id,
						{ contact_name: 'Hacked' },
						org1.id,
						user1.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('org A cannot delete org B stops', async () => {
			await withTestTransaction(async () => {
				const { org1, stop2 } = await createTwoTenants();

				await expect(
					stopService.deleteStop(stop2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getStopsByMap enforces map ownership', async () => {
			await withTestTransaction(async () => {
				const { org1, map2 } = await createTwoTenants();

				await expect(
					stopService.getStopsByMap(map2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('cannot create stop with another org map', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map2, location1 } = await createTwoTenants();

				await expect(
					stopService.createStop(
						{ map_id: map2.id, location_id: location1.id },
						org1.id,
						user1.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('cannot create stop with another org location', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map1, location2 } = await createTwoTenants();

				await expect(
					stopService.createStop(
						{ map_id: map1.id, location_id: location2.id },
						org1.id,
						user1.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	// ============================================================================
	// MapService Isolation
	// ============================================================================
	describe('MapService Isolation', () => {
		it('org A can read own map', async () => {
			await withTestTransaction(async () => {
				const { org1, map1 } = await createTwoTenants();

				const map = await mapService.getMapById(map1.id, org1.id);
				expect(map.id).toBe(map1.id);
			});
		});

		it('org A cannot read org B maps - throws NOT_FOUND', async () => {
			await withTestTransaction(async () => {
				const { org1, map2 } = await createTwoTenants();

				await expect(
					mapService.getMapById(map2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getMaps returns only own org maps', async () => {
			await withTestTransaction(async () => {
				const { org1, org2 } = await createTwoTenants();

				const mapsOrg1 = await mapService.getMaps(org1.id);
				const mapsOrg2 = await mapService.getMaps(org2.id);

				expect(mapsOrg1.every((m) => m.organization_id === org1.id)).toBe(true);
				expect(mapsOrg2.every((m) => m.organization_id === org2.id)).toBe(true);

				expect(mapsOrg1.length).toBeGreaterThanOrEqual(1);
				expect(mapsOrg2.length).toBeGreaterThanOrEqual(1);
			});
		});

		it('org A cannot update org B maps', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, map2 } = await createTwoTenants();

				await expect(
					mapService.updateMap(map2.id, { title: 'Hacked' }, org1.id, user1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('org A cannot delete org B maps', async () => {
			await withTestTransaction(async () => {
				const { org1, map2 } = await createTwoTenants();

				await expect(
					mapService.deleteMap(map2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('cannot add another org driver to your map', async () => {
			await withTestTransaction(async () => {
				const { org1, map1, driver2 } = await createTwoTenants();

				await expect(
					mapService.addDriverToMap(driver2.id, map1.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('cannot add your driver to another org map', async () => {
			await withTestTransaction(async () => {
				const { org1, map2, driver1 } = await createTwoTenants();

				await expect(
					mapService.addDriverToMap(driver1.id, map2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	// ============================================================================
	// RouteService Isolation
	// ============================================================================
	describe('RouteService Isolation', () => {
		it('org A can read own route', async () => {
			await withTestTransaction(async () => {
				const { org1, route1 } = await createTwoTenants();

				const route = await routeService.getRouteById(route1.id, org1.id);
				expect(route.id).toBe(route1.id);
			});
		});

		it('org A cannot read org B routes - throws NOT_FOUND', async () => {
			await withTestTransaction(async () => {
				const { org1, route2 } = await createTwoTenants();

				await expect(
					routeService.getRouteById(route2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getRoutesByMap returns only own org routes', async () => {
			await withTestTransaction(async () => {
				const { org1, org2, map1, map2 } = await createTwoTenants();

				const routesOrg1 = await routeService.getRoutesByMap(map1.id, org1.id);
				const routesOrg2 = await routeService.getRoutesByMap(map2.id, org2.id);

				expect(routesOrg1.every((r) => r.organization_id === org1.id)).toBe(
					true
				);
				expect(routesOrg2.every((r) => r.organization_id === org2.id)).toBe(
					true
				);

				expect(routesOrg1.length).toBeGreaterThanOrEqual(1);
				expect(routesOrg2.length).toBeGreaterThanOrEqual(1);
			});
		});
	});

	// ============================================================================
	// RouteShareService Isolation
	// ============================================================================
	describe('RouteShareService Isolation', () => {
		it('org A can read own share', async () => {
			await withTestTransaction(async () => {
				const { org1, share1 } = await createTwoTenants();

				const share = await routeShareService.getShareById(share1.id, org1.id);
				expect(share.id).toBe(share1.id);
			});
		});

		it('org A cannot read org B shares - throws NOT_FOUND', async () => {
			await withTestTransaction(async () => {
				const { org1, share2 } = await createTwoTenants();

				await expect(
					routeShareService.getShareById(share2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('org A cannot revoke org B shares', async () => {
			await withTestTransaction(async () => {
				const { org1, share2 } = await createTwoTenants();

				await expect(
					routeShareService.revokeShare(share2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('org A cannot delete org B shares', async () => {
			await withTestTransaction(async () => {
				const { org1, share2 } = await createTwoTenants();

				await expect(
					routeShareService.deleteShare(share2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('org A cannot get shares for org B routes', async () => {
			await withTestTransaction(async () => {
				const { org1, route2 } = await createTwoTenants();

				await expect(
					routeShareService.getSharesForRoute(route2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	// ============================================================================
	// DriverMapMembership Isolation (via MapService)
	// ============================================================================
	describe('DriverMapMembership Isolation', () => {
		it('getDriversForMap enforces map ownership', async () => {
			await withTestTransaction(async () => {
				const { org1, map2 } = await createTwoTenants();

				await expect(
					mapService.getDriversForMap(map2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('cannot remove driver from another org map', async () => {
			await withTestTransaction(async () => {
				const { org1, map2, driver2 } = await createTwoTenants();

				await expect(
					mapService.removeDriverFromMap(driver2.id, map2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	// ============================================================================
	// DriverService Isolation
	// ============================================================================
	describe('DriverService Isolation', () => {
		it('org A can read own driver', async () => {
			await withTestTransaction(async () => {
				const { org1, driver1 } = await createTwoTenants();

				const driver = await driverService.getDriverById(driver1.id, org1.id);
				expect(driver.id).toBe(driver1.id);
			});
		});

		it('org A cannot read org B drivers - throws NOT_FOUND', async () => {
			await withTestTransaction(async () => {
				const { org1, driver2 } = await createTwoTenants();

				await expect(
					driverService.getDriverById(driver2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getDrivers returns only own org drivers', async () => {
			await withTestTransaction(async () => {
				const { org1, org2 } = await createTwoTenants();

				const driversOrg1 = await driverService.getDrivers(org1.id);
				const driversOrg2 = await driverService.getDrivers(org2.id);

				expect(driversOrg1.every((d) => d.organization_id === org1.id)).toBe(
					true
				);
				expect(driversOrg2.every((d) => d.organization_id === org2.id)).toBe(
					true
				);

				expect(driversOrg1.length).toBeGreaterThanOrEqual(1);
				expect(driversOrg2.length).toBeGreaterThanOrEqual(1);
			});
		});

		it('org A cannot update org B drivers', async () => {
			await withTestTransaction(async () => {
				const { org1, user1, driver2 } = await createTwoTenants();

				await expect(
					driverService.updateDriver(
						driver2.id,
						{ name: 'Hacked' },
						org1.id,
						user1.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('org A cannot delete org B drivers', async () => {
			await withTestTransaction(async () => {
				const { org1, driver2 } = await createTwoTenants();

				await expect(
					driverService.deleteDriver(driver2.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	// ============================================================================
	// UserService Isolation
	// ============================================================================
	describe('UserService Isolation', () => {
		it('org A can read own user', { timeout: 15000 }, async () => {
			await withTestTransaction(async () => {
				const { org1, user1 } = await createTwoTenants();

				const user = await userService.getUserById(user1.id, org1.id);
				expect(user.id).toBe(user1.id);
			});
		});

		it(
			'org A cannot read org B users - throws NOT_FOUND',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { org1, user2 } = await createTwoTenants();

					await expect(
						userService.getUserById(user2.id, org1.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			}
		);

		it(
			'getPublicUsers returns only own org users',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { org1, org2 } = await createTwoTenants();

					const usersOrg1 = await userService.getPublicUsers(org1.id);
					const usersOrg2 = await userService.getPublicUsers(org2.id);

					expect(usersOrg1.every((u) => u.organization_id === org1.id)).toBe(
						true
					);
					expect(usersOrg2.every((u) => u.organization_id === org2.id)).toBe(
						true
					);

					expect(usersOrg1.length).toBeGreaterThanOrEqual(1);
					expect(usersOrg2.length).toBeGreaterThanOrEqual(1);
				});
			}
		);

		it(
			'org A users do not appear in org B user list',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { org1, org2, user1, user2 } = await createTwoTenants();

					const usersOrg1 = await userService.getPublicUsers(org1.id);
					const usersOrg2 = await userService.getPublicUsers(org2.id);

					const org1UserIds = usersOrg1.map((u) => u.id);
					const org2UserIds = usersOrg2.map((u) => u.id);

					expect(org2UserIds).not.toContain(user1.id);
					expect(org1UserIds).not.toContain(user2.id);
				});
			}
		);
	});

	// ============================================================================
	// InvitationService Isolation
	// ============================================================================
	describe('InvitationService Isolation', () => {
		it('org A can read own invitation', { timeout: 15000 }, async () => {
			await withTestTransaction(async () => {
				const { org1, invitation1 } = await createTwoTenants();

				const invitation = await invitationService.getInvitationById(
					invitation1.id,
					org1.id
				);
				expect(invitation.id).toBe(invitation1.id);
			});
		});

		it(
			'org A cannot read org B invitations - throws NOT_FOUND',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { org1, invitation2 } = await createTwoTenants();

					await expect(
						invitationService.getInvitationById(invitation2.id, org1.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			}
		);

		it(
			'getInvitations returns only own org invitations',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { org1, org2 } = await createTwoTenants();

					const invitationsOrg1 = await invitationService.getInvitations(
						org1.id
					);
					const invitationsOrg2 = await invitationService.getInvitations(
						org2.id
					);

					expect(
						invitationsOrg1.every((i) => i.organization_id === org1.id)
					).toBe(true);
					expect(
						invitationsOrg2.every((i) => i.organization_id === org2.id)
					).toBe(true);

					expect(invitationsOrg1.length).toBeGreaterThanOrEqual(1);
					expect(invitationsOrg2.length).toBeGreaterThanOrEqual(1);
				});
			}
		);

		it(
			'org A invitations do not appear in org B invitation list',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { org1, org2, invitation1, invitation2 } =
						await createTwoTenants();

					const invitationsOrg1 = await invitationService.getInvitations(
						org1.id
					);
					const invitationsOrg2 = await invitationService.getInvitations(
						org2.id
					);

					const org1InvitationIds = invitationsOrg1.map((i) => i.id);
					const org2InvitationIds = invitationsOrg2.map((i) => i.id);

					expect(org2InvitationIds).not.toContain(invitation1.id);
					expect(org1InvitationIds).not.toContain(invitation2.id);
				});
			}
		);

		it(
			'org A cannot delete org B invitations - throws NOT_FOUND',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { org1, invitation2 } = await createTwoTenants();

					await expect(
						invitationService.deleteInvitation(invitation2.id, org1.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			}
		);
	});
});
