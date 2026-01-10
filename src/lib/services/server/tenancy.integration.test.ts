/**
 * Multi-Tenancy Isolation Tests
 *
 * Verifies that all organization-scoped models enforce proper tenant isolation.
 * Creates 2 organizations with identical data structures and verifies complete
 * isolation across all CRUD operations.
 */
import { db } from '$lib/server/db';
import {
	depots,
	driverMapMemberships,
	drivers,
	invitations,
	locations,
	maps,
	organizations,
	routes,
	routeShares,
	stops,
	users
} from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createInvitation,
	createLocation,
	createMap,
	createOrganization,
	createRoute,
	createRouteShare,
	createStop,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { depotService } from './depot.service';
import { driverService } from './driver.service';
import { ServiceError } from './errors';
import { invitationService } from './invitation.service';
import { locationService } from './location.service';
import { mapService } from './map.service';
import { routeService } from './route.service';
import { routeShareService } from './route-share.service';
import { stopService } from './stop.service';
import { userService } from './user.service';

/**
 * Test fixtures for two organizations with identical data structures
 */
let org1: { id: string };
let org2: { id: string };
let user1: { id: string };
let user2: { id: string };
let location1: { id: string };
let location2: { id: string };
let depot1: { id: string };
let depot2: { id: string };
let map1: { id: string };
let map2: { id: string };
let driver1: { id: string };
let driver2: { id: string };
let stop1: { id: string };
let stop2: { id: string };
let route1: { id: string };
let route2: { id: string };
let share1: { id: string };
let share2: { id: string };
let invitation1: { id: string };
let invitation2: { id: string };

// Track IDs for cleanup
const orgIds: string[] = [];
const userIds: string[] = [];
const locationIds: string[] = [];
const depotIds: string[] = [];
const mapIds: string[] = [];
const driverIds: string[] = [];
const stopIds: string[] = [];
const routeIds: string[] = [];
const shareIds: string[] = [];
const membershipIds: string[] = [];
const invitationIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create two organizations
	org1 = await createOrganization(tx, { name: 'Tenant A' });
	org2 = await createOrganization(tx, { name: 'Tenant B' });
	orgIds.push(org1.id, org2.id);

	// Create users
	user1 = await createUser(tx, { organization_id: org1.id, role: 'admin' });
	user2 = await createUser(tx, { organization_id: org2.id, role: 'admin' });
	userIds.push(user1.id, user2.id);

	// Create locations
	location1 = await createLocation(tx, { organization_id: org1.id });
	location2 = await createLocation(tx, { organization_id: org2.id });
	locationIds.push(location1.id, location2.id);

	// Create depots
	depot1 = await createDepot(tx, {
		organization_id: org1.id,
		location_id: location1.id
	});
	depot2 = await createDepot(tx, {
		organization_id: org2.id,
		location_id: location2.id
	});
	depotIds.push(depot1.id, depot2.id);

	// Create maps
	map1 = await createMap(tx, { organization_id: org1.id });
	map2 = await createMap(tx, { organization_id: org2.id });
	mapIds.push(map1.id, map2.id);

	// Create drivers
	driver1 = await createDriver(tx, { organization_id: org1.id });
	driver2 = await createDriver(tx, { organization_id: org2.id });
	driverIds.push(driver1.id, driver2.id);

	// Create stops
	stop1 = await createStop(tx, {
		organization_id: org1.id,
		map_id: map1.id,
		location_id: location1.id
	});
	stop2 = await createStop(tx, {
		organization_id: org2.id,
		map_id: map2.id,
		location_id: location2.id
	});
	stopIds.push(stop1.id, stop2.id);

	// Create routes
	route1 = await createRoute(tx, {
		organization_id: org1.id,
		map_id: map1.id,
		driver_id: driver1.id,
		depot_id: depot1.id
	});
	route2 = await createRoute(tx, {
		organization_id: org2.id,
		map_id: map2.id,
		driver_id: driver2.id,
		depot_id: depot2.id
	});
	routeIds.push(route1.id, route2.id);

	// Create route shares
	share1 = await createRouteShare(tx, {
		organization_id: org1.id,
		route_id: route1.id
	});
	share2 = await createRouteShare(tx, {
		organization_id: org2.id,
		route_id: route2.id
	});
	shareIds.push(share1.id, share2.id);

	// Create invitations
	invitation1 = await createInvitation(tx, {
		organization_id: org1.id,
		created_by: user1.id
	});
	invitation2 = await createInvitation(tx, {
		organization_id: org2.id,
		created_by: user2.id
	});
	invitationIds.push(invitation1.id, invitation2.id);
});

afterAll(async () => {
	// Cleanup in reverse FK order
	if (invitationIds.length > 0) {
		await db.delete(invitations).where(inArray(invitations.id, invitationIds));
	}
	if (shareIds.length > 0) {
		await db.delete(routeShares).where(inArray(routeShares.id, shareIds));
	}
	if (membershipIds.length > 0) {
		await db
			.delete(driverMapMemberships)
			.where(inArray(driverMapMemberships.id, membershipIds));
	}
	if (routeIds.length > 0) {
		await db.delete(routes).where(inArray(routes.id, routeIds));
	}
	if (stopIds.length > 0) {
		await db.delete(stops).where(inArray(stops.id, stopIds));
	}
	if (depotIds.length > 0) {
		await db.delete(depots).where(inArray(depots.id, depotIds));
	}
	if (mapIds.length > 0) {
		await db.delete(maps).where(inArray(maps.id, mapIds));
	}
	if (driverIds.length > 0) {
		await db.delete(drivers).where(inArray(drivers.id, driverIds));
	}
	if (locationIds.length > 0) {
		await db.delete(locations).where(inArray(locations.id, locationIds));
	}
	if (userIds.length > 0) {
		await db.delete(users).where(inArray(users.id, userIds));
	}
	if (orgIds.length > 0) {
		await db.delete(organizations).where(inArray(organizations.id, orgIds));
	}
});

describe('Multi-Tenancy Isolation Tests', () => {
	// ============================================================================
	// LocationService Isolation
	// ============================================================================
	describe('LocationService Isolation', () => {
		it('org A can read own location', async () => {
			const location = await locationService.getLocationById(
				location1.id,
				org1.id
			);
			expect(location.id).toBe(location1.id);
		});

		it('org A cannot read org B locations - throws FORBIDDEN', async () => {
			try {
				await locationService.getLocationById(location2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('getLocations returns only own org locations', async () => {
			const locationsOrg1 = await locationService.getLocations(org1.id);
			const locationsOrg2 = await locationService.getLocations(org2.id);

			expect(locationsOrg1.every((l) => l.organization_id === org1.id)).toBe(
				true
			);
			expect(locationsOrg2.every((l) => l.organization_id === org2.id)).toBe(
				true
			);

			// Each org should have at least one location
			expect(locationsOrg1.length).toBeGreaterThanOrEqual(1);
			expect(locationsOrg2.length).toBeGreaterThanOrEqual(1);
		});

		it('org A cannot delete org B locations', async () => {
			try {
				await locationService.deleteLocation(location2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('verifyLocationOwnership blocks cross-tenant access', async () => {
			try {
				await locationService.verifyLocationOwnership(location2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	// ============================================================================
	// DepotService Isolation
	// ============================================================================
	describe('DepotService Isolation', () => {
		it('org A can read own depot', async () => {
			const result = await depotService.getDepotById(depot1.id, org1.id);
			// DepotService returns { depot, location } structure
			expect(result.depot.id).toBe(depot1.id);
		});

		it('org A cannot read org B depots - throws FORBIDDEN', async () => {
			try {
				await depotService.getDepotById(depot2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('getDepots returns only own org depots', async () => {
			const depotsOrg1 = await depotService.getDepots(org1.id);
			const depotsOrg2 = await depotService.getDepots(org2.id);

			// getDepots returns array of { depot, location } objects
			expect(depotsOrg1.every((d) => d.depot.organization_id === org1.id)).toBe(
				true
			);
			expect(depotsOrg2.every((d) => d.depot.organization_id === org2.id)).toBe(
				true
			);

			expect(depotsOrg1.length).toBeGreaterThanOrEqual(1);
			expect(depotsOrg2.length).toBeGreaterThanOrEqual(1);
		});

		it('org A cannot update org B depots', async () => {
			try {
				await depotService.updateDepot(
					depot2.id,
					{ name: 'Hacked' },
					org1.id,
					user1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('org A cannot delete org B depots', async () => {
			try {
				await depotService.deleteDepot(depot2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('cannot create depot with another org location', async () => {
			try {
				await depotService.createDepot(
					{
						location_id: location2.id,
						name: 'Cross-tenant depot',
						default_depot: false
					},
					org1.id,
					user1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	// ============================================================================
	// StopService Isolation
	// ============================================================================
	describe('StopService Isolation', () => {
		it('org A can read own stop', async () => {
			const stop = await stopService.getStopById(stop1.id, org1.id);
			expect(stop.stop.id).toBe(stop1.id);
		});

		it('org A cannot read org B stops - throws FORBIDDEN', async () => {
			try {
				await stopService.getStopById(stop2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('getStops returns only own org stops', async () => {
			const stopsOrg1 = await stopService.getStops(org1.id);
			const stopsOrg2 = await stopService.getStops(org2.id);

			expect(stopsOrg1.every((s) => s.organization_id === org1.id)).toBe(true);
			expect(stopsOrg2.every((s) => s.organization_id === org2.id)).toBe(true);

			expect(stopsOrg1.length).toBeGreaterThanOrEqual(1);
			expect(stopsOrg2.length).toBeGreaterThanOrEqual(1);
		});

		it('org A cannot update org B stops', async () => {
			try {
				await stopService.updateStop(
					stop2.id,
					{ contact_name: 'Hacked' },
					org1.id,
					user1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('org A cannot delete org B stops', async () => {
			try {
				await stopService.deleteStop(stop2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('getStopsByMap enforces map ownership', async () => {
			try {
				await stopService.getStopsByMap(map2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('cannot create stop with another org map', async () => {
			try {
				await stopService.createStop(
					{ map_id: map2.id, location_id: location1.id },
					org1.id,
					user1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('cannot create stop with another org location', async () => {
			try {
				await stopService.createStop(
					{ map_id: map1.id, location_id: location2.id },
					org1.id,
					user1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	// ============================================================================
	// MapService Isolation
	// ============================================================================
	describe('MapService Isolation', () => {
		it('org A can read own map', async () => {
			const map = await mapService.getMapById(map1.id, org1.id);
			expect(map.id).toBe(map1.id);
		});

		it('org A cannot read org B maps - throws FORBIDDEN', async () => {
			try {
				await mapService.getMapById(map2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('getMaps returns only own org maps', async () => {
			const mapsOrg1 = await mapService.getMaps(org1.id);
			const mapsOrg2 = await mapService.getMaps(org2.id);

			expect(mapsOrg1.every((m) => m.organization_id === org1.id)).toBe(true);
			expect(mapsOrg2.every((m) => m.organization_id === org2.id)).toBe(true);

			expect(mapsOrg1.length).toBeGreaterThanOrEqual(1);
			expect(mapsOrg2.length).toBeGreaterThanOrEqual(1);
		});

		it('org A cannot update org B maps', async () => {
			try {
				await mapService.updateMap(
					map2.id,
					{ title: 'Hacked' },
					org1.id,
					user1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('org A cannot delete org B maps', async () => {
			try {
				await mapService.deleteMap(map2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('cannot add another org driver to your map', async () => {
			try {
				await mapService.addDriverToMap(driver2.id, map1.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('cannot add your driver to another org map', async () => {
			try {
				await mapService.addDriverToMap(driver1.id, map2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	// ============================================================================
	// RouteService Isolation
	// ============================================================================
	describe('RouteService Isolation', () => {
		it('org A can read own route', async () => {
			const route = await routeService.getRouteById(route1.id, org1.id);
			expect(route.id).toBe(route1.id);
		});

		it('org A cannot read org B routes - throws FORBIDDEN', async () => {
			try {
				await routeService.getRouteById(route2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('getRoutesByMap returns only own org routes', async () => {
			const routesOrg1 = await routeService.getRoutesByMap(map1.id, org1.id);
			const routesOrg2 = await routeService.getRoutesByMap(map2.id, org2.id);

			expect(routesOrg1.every((r) => r.organization_id === org1.id)).toBe(true);
			expect(routesOrg2.every((r) => r.organization_id === org2.id)).toBe(true);

			expect(routesOrg1.length).toBeGreaterThanOrEqual(1);
			expect(routesOrg2.length).toBeGreaterThanOrEqual(1);
		});

		it('verifyRouteOwnership blocks cross-tenant access', async () => {
			try {
				await routeService.verifyRouteOwnership(route2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	// ============================================================================
	// RouteShareService Isolation
	// ============================================================================
	describe('RouteShareService Isolation', () => {
		it('org A can read own share', async () => {
			const share = await routeShareService.getShare(share1.id, org1.id);
			expect(share.id).toBe(share1.id);
		});

		it('org A cannot read org B shares - throws NOT_FOUND', async () => {
			try {
				await routeShareService.getShare(share2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('org A cannot revoke org B shares', async () => {
			try {
				await routeShareService.revokeShare(share2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('org A cannot delete org B shares', async () => {
			try {
				await routeShareService.deleteShare(share2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('org A cannot get shares for org B routes', async () => {
			try {
				await routeShareService.getSharesForRoute(route2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	// ============================================================================
	// DriverMapMembership Isolation (via MapService)
	// ============================================================================
	describe('DriverMapMembership Isolation', () => {
		it('getDriversForMap enforces map ownership', async () => {
			try {
				await mapService.getDriversForMap(map2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('cannot remove driver from another org map', async () => {
			try {
				await mapService.removeDriverFromMap(driver2.id, map2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				// Will throw NOT_FOUND because driver2 is not in org1
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});

	// ============================================================================
	// DriverService Isolation
	// ============================================================================
	describe('DriverService Isolation', () => {
		it('org A can read own driver', async () => {
			const driver = await driverService.getDriverById(driver1.id, org1.id);
			expect(driver.id).toBe(driver1.id);
		});

		it('org A cannot read org B drivers - throws FORBIDDEN', async () => {
			try {
				await driverService.getDriverById(driver2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('getDrivers returns only own org drivers', async () => {
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

		it('org A cannot update org B drivers', async () => {
			try {
				await driverService.updateDriver(
					driver2.id,
					{ name: 'Hacked' },
					org1.id,
					user1.id
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});

		it('org A cannot delete org B drivers', async () => {
			try {
				await driverService.deleteDriver(driver2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	// ============================================================================
	// UserService Isolation
	// ============================================================================
	describe('UserService Isolation', () => {
		it('org A can read own user', async () => {
			const user = await userService.getUser(user1.id, org1.id);
			expect(user.id).toBe(user1.id);
		});

		it('org A cannot read org B users - throws NOT_FOUND', async () => {
			try {
				await userService.getUser(user2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('getPublicUsers returns only own org users', async () => {
			const usersOrg1 = await userService.getPublicUsers(org1.id);
			const usersOrg2 = await userService.getPublicUsers(org2.id);

			expect(usersOrg1.every((u) => u.organization_id === org1.id)).toBe(true);
			expect(usersOrg2.every((u) => u.organization_id === org2.id)).toBe(true);

			expect(usersOrg1.length).toBeGreaterThanOrEqual(1);
			expect(usersOrg2.length).toBeGreaterThanOrEqual(1);
		});

		it('org A users do not appear in org B user list', async () => {
			const usersOrg1 = await userService.getPublicUsers(org1.id);
			const usersOrg2 = await userService.getPublicUsers(org2.id);

			const org1UserIds = usersOrg1.map((u) => u.id);
			const org2UserIds = usersOrg2.map((u) => u.id);

			// Org1 users should not appear in org2 results
			expect(org2UserIds).not.toContain(user1.id);

			// Org2 users should not appear in org1 results
			expect(org1UserIds).not.toContain(user2.id);
		});
	});

	// ============================================================================
	// InvitationService Isolation
	// ============================================================================
	describe('InvitationService Isolation', () => {
		it('org A can read own invitation', async () => {
			const invitation = await invitationService.getInvitation(
				invitation1.id,
				org1.id
			);
			expect(invitation.id).toBe(invitation1.id);
		});

		it('org A cannot read org B invitations - throws NOT_FOUND', async () => {
			try {
				await invitationService.getInvitation(invitation2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('getInvitations returns only own org invitations', async () => {
			const invitationsOrg1 = await invitationService.getInvitations(org1.id);
			const invitationsOrg2 = await invitationService.getInvitations(org2.id);

			expect(invitationsOrg1.every((i) => i.organization_id === org1.id)).toBe(
				true
			);
			expect(invitationsOrg2.every((i) => i.organization_id === org2.id)).toBe(
				true
			);

			expect(invitationsOrg1.length).toBeGreaterThanOrEqual(1);
			expect(invitationsOrg2.length).toBeGreaterThanOrEqual(1);
		});

		it('org A invitations do not appear in org B invitation list', async () => {
			const invitationsOrg1 = await invitationService.getInvitations(org1.id);
			const invitationsOrg2 = await invitationService.getInvitations(org2.id);

			const org1InvitationIds = invitationsOrg1.map((i) => i.id);
			const org2InvitationIds = invitationsOrg2.map((i) => i.id);

			// Org1 invitations should not appear in org2 results
			expect(org2InvitationIds).not.toContain(invitation1.id);

			// Org2 invitations should not appear in org1 results
			expect(org1InvitationIds).not.toContain(invitation2.id);
		});

		it('org A cannot delete org B invitations - throws NOT_FOUND', async () => {
			try {
				await invitationService.deleteInvitation(invitation2.id, org1.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('NOT_FOUND');
			}
		});
	});
});
