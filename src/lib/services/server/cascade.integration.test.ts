/**
 * Cascading Operations Tests
 *
 * Verifies that cascading deletes and service-level cascade operations
 * work correctly across all related entities.
 */
import { db } from '$lib/server/db';
import {
	depots,
	driverMapMemberships,
	drivers,
	locations,
	maps,
	matrices,
	optimizationJobs,
	organizations,
	routes,
	routeShares,
	stops,
	users
} from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createDriverMapMembership,
	createLocation,
	createMap,
	createMatrix,
	createOptimizationJob,
	createOrganization,
	createRoute,
	createRouteShare,
	createStop,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { depotService } from './depot.service';
import { driverService } from './driver.service';
import { ServiceError } from './errors';
import { locationService } from './location.service';
import { mapService } from './map.service';

/**
 * Test fixtures
 */
let org: { id: string };
let user: { id: string };
let location1: { id: string };
let location2: { id: string };
let depot: { id: string };
let map: { id: string };
let driver: { id: string };
let tempDriver: { id: string };
let stop1: { id: string };
let stop2: { id: string };
let route: { id: string };
let share: { id: string };
let membership: { id: string };
let tempMembership: { id: string };
let matrix: { id: string };
let optimizationJob: { id: string };

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
const matrixIds: string[] = [];
const jobIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create organization and user
	org = await createOrganization(tx, { name: 'Cascade Test Org' });
	orgIds.push(org.id);

	user = await createUser(tx, { organization_id: org.id, role: 'admin' });
	userIds.push(user.id);

	// Create two locations (one for depot, one for stops)
	location1 = await createLocation(tx, { organization_id: org.id });
	location2 = await createLocation(tx, { organization_id: org.id });
	locationIds.push(location1.id, location2.id);

	// Create depot
	depot = await createDepot(tx, {
		organization_id: org.id,
		location_id: location1.id
	});
	depotIds.push(depot.id);

	// Create map
	map = await createMap(tx, { organization_id: org.id });
	mapIds.push(map.id);

	// Create permanent driver
	driver = await createDriver(tx, {
		organization_id: org.id,
		temporary: false
	});
	driverIds.push(driver.id);

	// Create temporary driver
	tempDriver = await createDriver(tx, {
		organization_id: org.id,
		temporary: true
	});
	driverIds.push(tempDriver.id);

	// Create stops
	stop1 = await createStop(tx, {
		organization_id: org.id,
		map_id: map.id,
		location_id: location2.id,
		driver_id: driver.id,
		delivery_index: 1
	});
	stop2 = await createStop(tx, {
		organization_id: org.id,
		map_id: map.id,
		location_id: location2.id
	});
	stopIds.push(stop1.id, stop2.id);

	// Create route
	route = await createRoute(tx, {
		organization_id: org.id,
		map_id: map.id,
		driver_id: driver.id,
		depot_id: depot.id
	});
	routeIds.push(route.id);

	// Create route share
	share = await createRouteShare(tx, {
		organization_id: org.id,
		route_id: route.id
	});
	shareIds.push(share.id);

	// Create driver memberships
	membership = await createDriverMapMembership(tx, {
		organization_id: org.id,
		driver_id: driver.id,
		map_id: map.id
	});
	tempMembership = await createDriverMapMembership(tx, {
		organization_id: org.id,
		driver_id: tempDriver.id,
		map_id: map.id
	});
	membershipIds.push(membership.id, tempMembership.id);

	// Create matrix
	matrix = await createMatrix(tx, {
		organization_id: org.id,
		map_id: map.id
	});
	matrixIds.push(matrix.id);

	// Create optimization job
	optimizationJob = await createOptimizationJob(tx, {
		organization_id: org.id,
		map_id: map.id,
		matrix_id: matrix.id,
		depot_id: depot.id
	});
	jobIds.push(optimizationJob.id);
});

afterAll(async () => {
	// Cleanup in reverse FK order
	if (jobIds.length > 0) {
		await db
			.delete(optimizationJobs)
			.where(inArray(optimizationJobs.id, jobIds));
	}
	if (matrixIds.length > 0) {
		await db.delete(matrices).where(inArray(matrices.id, matrixIds));
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
}, 30000);

describe('Cascading Operations Tests', () => {
	// ============================================================================
	// Driver Deletion Prevention
	// ============================================================================
	describe('Driver Deletion Prevention', () => {
		it('driver with assigned stops cannot be deleted - throws VALIDATION', async () => {
			try {
				await driverService.deleteDriver(driver.id, org.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('VALIDATION');
				expect((error as ServiceError).message).toContain('assigned to stops');
			}
		});

		it('driver with no assigned stops can be deleted', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new driver with no stops
			const newDriver = await createDriver(tx, {
				organization_id: org.id,
				temporary: false
			});
			driverIds.push(newDriver.id);

			const result = await driverService.deleteDriver(newDriver.id, org.id);
			expect(result.success).toBe(true);

			// Verify driver is deleted
			const remaining = await db
				.select()
				.from(drivers)
				.where(eq(drivers.id, newDriver.id));
			expect(remaining.length).toBe(0);

			// Remove from cleanup array since already deleted
			const idx = driverIds.indexOf(newDriver.id);
			if (idx > -1) driverIds.splice(idx, 1);
		});
	});

	// ============================================================================
	// Depot Deletion Prevention
	// ============================================================================
	describe('Depot Deletion Prevention', () => {
		it('depot used in routes cannot be deleted - throws VALIDATION', async () => {
			try {
				await depotService.deleteDepot(depot.id, org.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('VALIDATION');
				expect((error as ServiceError).message).toContain('assigned to a route');
			}
		});

		it('depot not used in routes can be deleted', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new location and depot not used in any route
			const newLocation = await createLocation(tx, { organization_id: org.id });
			locationIds.push(newLocation.id);

			const newDepot = await createDepot(tx, {
				organization_id: org.id,
				location_id: newLocation.id
			});
			depotIds.push(newDepot.id);

			const result = await depotService.deleteDepot(newDepot.id, org.id);
			expect(result.success).toBe(true);

			// Verify depot is deleted
			const remaining = await db
				.select()
				.from(depots)
				.where(eq(depots.id, newDepot.id));
			expect(remaining.length).toBe(0);

			// Remove from cleanup array since already deleted
			const idx = depotIds.indexOf(newDepot.id);
			if (idx > -1) depotIds.splice(idx, 1);
		});
	});

	// ============================================================================
	// Temporary Driver Cleanup
	// ============================================================================
	describe('Temporary Driver Cleanup', () => {
		it('temporary driver is deleted when removed from map', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new map and temporary driver for this test
			const testMap = await createMap(tx, { organization_id: org.id });
			mapIds.push(testMap.id);

			const testTempDriver = await createDriver(tx, {
				organization_id: org.id,
				temporary: true
			});
			driverIds.push(testTempDriver.id);

			// Manually create membership instead of using addDriverToMap to avoid
			// potential transaction nesting issues in tests
			const [createdMembership] = await db
				.insert(driverMapMemberships)
				.values({
					organization_id: org.id,
					driver_id: testTempDriver.id,
					map_id: testMap.id
				})
				.returning();
			membershipIds.push(createdMembership.id);

			// Remove driver from map - should delete the temp driver
			await mapService.removeDriverFromMap(
				testTempDriver.id,
				testMap.id,
				org.id
			);

			// Verify temp driver is deleted
			const remaining = await db
				.select()
				.from(drivers)
				.where(eq(drivers.id, testTempDriver.id));
			expect(remaining.length).toBe(0);

			// Remove from cleanup arrays since already deleted
			const driverIdx = driverIds.indexOf(testTempDriver.id);
			if (driverIdx > -1) driverIds.splice(driverIdx, 1);

			// Membership is also deleted
			const memberIdx = membershipIds.indexOf(createdMembership.id);
			if (memberIdx > -1) membershipIds.splice(memberIdx, 1);
		});

		it('permanent driver is NOT deleted when removed from map', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new map and permanent driver for this test
			const testMap = await createMap(tx, { organization_id: org.id });
			mapIds.push(testMap.id);

			const testDriver = await createDriver(tx, {
				organization_id: org.id,
				temporary: false
			});
			driverIds.push(testDriver.id);

			// Add driver to map (creates membership)
			await mapService.addDriverToMap(testDriver.id, testMap.id, org.id);

			// Remove driver from map - should NOT delete the permanent driver
			await mapService.removeDriverFromMap(testDriver.id, testMap.id, org.id);

			// Verify permanent driver still exists
			const remaining = await db
				.select()
				.from(drivers)
				.where(eq(drivers.id, testDriver.id));
			expect(remaining.length).toBe(1);

			// Membership was deleted, no need to track it
		}, 15000);
	});

	// ============================================================================
	// Reset Optimization Cascade
	// ============================================================================
	describe('Reset Optimization Cascade', () => {
		it('reset clears all stop driver assignments and delivery indices', async () => {
			const tx = db as unknown as TestTransaction;

			// Create fresh test data for this test
			const testMap = await createMap(tx, { organization_id: org.id });
			mapIds.push(testMap.id);

			const testDriver = await createDriver(tx, { organization_id: org.id });
			driverIds.push(testDriver.id);

			const testLocation = await createLocation(tx, { organization_id: org.id });
			locationIds.push(testLocation.id);

			const testDepot = await createDepot(tx, {
				organization_id: org.id,
				location_id: testLocation.id
			});
			depotIds.push(testDepot.id);

			// Create stops with driver assignments
			const testStop1 = await createStop(tx, {
				organization_id: org.id,
				map_id: testMap.id,
				location_id: testLocation.id,
				driver_id: testDriver.id,
				delivery_index: 1
			});
			const testStop2 = await createStop(tx, {
				organization_id: org.id,
				map_id: testMap.id,
				location_id: testLocation.id,
				driver_id: testDriver.id,
				delivery_index: 2
			});
			stopIds.push(testStop1.id, testStop2.id);

			// Create route
			const testRoute = await createRoute(tx, {
				organization_id: org.id,
				map_id: testMap.id,
				driver_id: testDriver.id,
				depot_id: testDepot.id
			});
			routeIds.push(testRoute.id);

			// Reset optimization
			await mapService.resetOptimization(testMap.id, org.id, user.id);

			// Verify stops have null driver_id and delivery_index
			const stopsAfter = await db
				.select()
				.from(stops)
				.where(eq(stops.map_id, testMap.id));

			expect(stopsAfter.length).toBe(2);
			stopsAfter.forEach((s) => {
				expect(s.driver_id).toBeNull();
				expect(s.delivery_index).toBeNull();
			});

			// Verify routes are deleted
			const routesAfter = await db
				.select()
				.from(routes)
				.where(eq(routes.map_id, testMap.id));
			expect(routesAfter.length).toBe(0);

			// Remove route from cleanup array since already deleted
			const idx = routeIds.indexOf(testRoute.id);
			if (idx > -1) routeIds.splice(idx, 1);
		});
	});

	// ============================================================================
	// Map Deletion Cascade
	// ============================================================================
	describe('Map Deletion Cascade', () => {
		it('deleting map cascades to stops, routes, shares, memberships, matrices, and jobs', async () => {
			const tx = db as unknown as TestTransaction;

			// Create complete test data for cascade test
			const testMap = await createMap(tx, { organization_id: org.id });
			const testDriver = await createDriver(tx, { organization_id: org.id });
			const testLocation = await createLocation(tx, { organization_id: org.id });
			const testDepot = await createDepot(tx, {
				organization_id: org.id,
				location_id: testLocation.id
			});

			const testStop = await createStop(tx, {
				organization_id: org.id,
				map_id: testMap.id,
				location_id: testLocation.id
			});

			const testRoute = await createRoute(tx, {
				organization_id: org.id,
				map_id: testMap.id,
				driver_id: testDriver.id,
				depot_id: testDepot.id
			});

			const testShare = await createRouteShare(tx, {
				organization_id: org.id,
				route_id: testRoute.id
			});

			const testMembership = await createDriverMapMembership(tx, {
				organization_id: org.id,
				driver_id: testDriver.id,
				map_id: testMap.id
			});

			const testMatrix = await createMatrix(tx, {
				organization_id: org.id,
				map_id: testMap.id
			});

			const testJob = await createOptimizationJob(tx, {
				organization_id: org.id,
				map_id: testMap.id,
				matrix_id: testMatrix.id,
				depot_id: testDepot.id
			});

			// Delete the map
			await mapService.deleteMap(testMap.id, org.id);

			// Verify all cascaded entities are deleted
			const stopsAfter = await db
				.select()
				.from(stops)
				.where(eq(stops.id, testStop.id));
			expect(stopsAfter.length).toBe(0);

			const routesAfter = await db
				.select()
				.from(routes)
				.where(eq(routes.id, testRoute.id));
			expect(routesAfter.length).toBe(0);

			const sharesAfter = await db
				.select()
				.from(routeShares)
				.where(eq(routeShares.id, testShare.id));
			expect(sharesAfter.length).toBe(0);

			const membershipsAfter = await db
				.select()
				.from(driverMapMemberships)
				.where(eq(driverMapMemberships.id, testMembership.id));
			expect(membershipsAfter.length).toBe(0);

			const matricesAfter = await db
				.select()
				.from(matrices)
				.where(eq(matrices.id, testMatrix.id));
			expect(matricesAfter.length).toBe(0);

			const jobsAfter = await db
				.select()
				.from(optimizationJobs)
				.where(eq(optimizationJobs.id, testJob.id));
			expect(jobsAfter.length).toBe(0);

			// Verify location, driver, and depot are NOT cascaded
			const locationAfter = await db
				.select()
				.from(locations)
				.where(eq(locations.id, testLocation.id));
			expect(locationAfter.length).toBe(1);

			const driverAfter = await db
				.select()
				.from(drivers)
				.where(eq(drivers.id, testDriver.id));
			expect(driverAfter.length).toBe(1);

			const depotAfter = await db
				.select()
				.from(depots)
				.where(eq(depots.id, testDepot.id));
			expect(depotAfter.length).toBe(1);

			// Cleanup non-cascaded entities
			await db.delete(depots).where(eq(depots.id, testDepot.id));
			await db.delete(drivers).where(eq(drivers.id, testDriver.id));
			await db.delete(locations).where(eq(locations.id, testLocation.id));
		});
	});

	// ============================================================================
	// Location Deletion Cascade
	// ============================================================================
	describe('Location Deletion Cascade', () => {
		it('deleting location cascades to stops and depot', async () => {
			const tx = db as unknown as TestTransaction;

			// Create test data
			const testMap = await createMap(tx, { organization_id: org.id });
			mapIds.push(testMap.id);

			const testLocation = await createLocation(tx, { organization_id: org.id });

			const testStop = await createStop(tx, {
				organization_id: org.id,
				map_id: testMap.id,
				location_id: testLocation.id
			});

			const testDepot = await createDepot(tx, {
				organization_id: org.id,
				location_id: testLocation.id
			});

			// Delete the location
			await locationService.deleteLocation(testLocation.id, org.id);

			// Verify stops are cascaded
			const stopsAfter = await db
				.select()
				.from(stops)
				.where(eq(stops.id, testStop.id));
			expect(stopsAfter.length).toBe(0);

			// Verify depot is cascaded
			const depotsAfter = await db
				.select()
				.from(depots)
				.where(eq(depots.id, testDepot.id));
			expect(depotsAfter.length).toBe(0);

			// Verify map is NOT cascaded
			const mapsAfter = await db
				.select()
				.from(maps)
				.where(eq(maps.id, testMap.id));
			expect(mapsAfter.length).toBe(1);
		});
	});
});
