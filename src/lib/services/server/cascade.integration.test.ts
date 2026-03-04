/**
 * Cascading Operations Tests
 *
 * Verifies that cascading deletes and service-level cascade operations
 * work correctly across all related entities.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
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
	routes,
	routeShares,
	stops
} from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createDriverMapMembership,
	createLocation,
	createMap,
	createMatrix,
	createOptimizationJob,
	createRoute,
	createRouteShare,
	createStop,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { depotService } from './depot.service';
import { driverService } from './driver.service';
import { locationService } from './location.service';
import { mapService } from './map.service';

describe('Cascading Operations Tests', () => {
	// ============================================================================
	// Driver Deletion Prevention
	// ============================================================================
	describe('Driver Deletion Prevention', () => {
		it('driver with assigned stops cannot be deleted - throws VALIDATION', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				const driver = await createDriver({
					organization_id: organization.id,
					temporary: false
				});
				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					driver_id: driver.id,
					delivery_index: 1
				});

				await expect(
					driverService.deleteDriver(driver.id, organization.id)
				).rejects.toMatchObject({
					code: 'VALIDATION',
					message: expect.stringContaining('assigned to stops')
				});
			});
		});

		it('driver with no assigned stops can be deleted', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					temporary: false
				});

				const result = await driverService.deleteDriver(
					driver.id,
					organization.id
				);
				expect(result.success).toBe(true);

				// Verify driver is deleted
				const remaining = await db
					.select()
					.from(drivers)
					.where(eq(drivers.id, driver.id));
				expect(remaining.length).toBe(0);
			});
		});
	});

	// ============================================================================
	// Depot Deletion Prevention
	// ============================================================================
	describe('Depot Deletion Prevention', () => {
		it('depot used in routes cannot be deleted - throws VALIDATION', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});
				const map = await createMap({ organization_id: organization.id });
				const driver = await createDriver({
					organization_id: organization.id
				});
				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});

				await expect(
					depotService.deleteDepot(depot.id, organization.id)
				).rejects.toMatchObject({
					code: 'VALIDATION',
					message: expect.stringContaining('assigned to a route')
				});
			});
		});

		it('depot not used in routes can be deleted', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});

				const result = await depotService.deleteDepot(
					depot.id,
					organization.id
				);
				expect(result.success).toBe(true);

				// Verify depot is deleted
				const remaining = await db
					.select()
					.from(depots)
					.where(eq(depots.id, depot.id));
				expect(remaining.length).toBe(0);
			});
		});
	});

	// ============================================================================
	// Temporary Driver Cleanup
	// ============================================================================
	describe('Temporary Driver Cleanup', () => {
		it('temporary driver is deleted when removed from map', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const testMap = await createMap({ organization_id: organization.id });
				const testTempDriver = await createDriver({
					organization_id: organization.id,
					temporary: true
				});

				// Manually create membership
				await db.insert(driverMapMemberships).values({
					organization_id: organization.id,
					driver_id: testTempDriver.id,
					map_id: testMap.id
				});

				// Remove driver from map - should delete the temp driver
				await mapService.removeDriverFromMap(
					testTempDriver.id,
					testMap.id,
					organization.id,
					user.id
				);

				// Verify temp driver is deleted
				const remaining = await db
					.select()
					.from(drivers)
					.where(eq(drivers.id, testTempDriver.id));
				expect(remaining.length).toBe(0);
			});
		});

		it('permanent driver is NOT deleted when removed from map', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const testMap = await createMap({ organization_id: organization.id });
				const testDriver = await createDriver({
					organization_id: organization.id,
					temporary: false
				});

				// Add driver to map (creates membership)
				await mapService.addDriverToMap(
					testDriver.id,
					testMap.id,
					organization.id
				);

				// Remove driver from map - should NOT delete the permanent driver
				await mapService.removeDriverFromMap(
					testDriver.id,
					testMap.id,
					organization.id,
					user.id
				);

				// Verify permanent driver still exists
				const remaining = await db
					.select()
					.from(drivers)
					.where(eq(drivers.id, testDriver.id));
				expect(remaining.length).toBe(1);
			});
		}, 15000);
	});

	// ============================================================================
	// Reset Optimization Cascade
	// ============================================================================
	describe('Reset Optimization Cascade', () => {
		it('reset clears all stop driver assignments and delivery indices', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const testMap = await createMap({ organization_id: organization.id });
				const testDriver = await createDriver({
					organization_id: organization.id
				});
				const testLocation = await createLocation({
					organization_id: organization.id
				});
				const testDepot = await createDepot({
					organization_id: organization.id,
					location_id: testLocation.id
				});

				// Create stops with driver assignments
				await createStop({
					organization_id: organization.id,
					map_id: testMap.id,
					location_id: testLocation.id,
					driver_id: testDriver.id,
					delivery_index: 1
				});
				await createStop({
					organization_id: organization.id,
					map_id: testMap.id,
					location_id: testLocation.id,
					driver_id: testDriver.id,
					delivery_index: 2
				});

				// Create route
				await createRoute({
					organization_id: organization.id,
					map_id: testMap.id,
					driver_id: testDriver.id,
					depot_id: testDepot.id
				});

				// Reset optimization
				await mapService.resetOptimization(
					testMap.id,
					organization.id,
					user.id
				);

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
			});
		});
	});

	// ============================================================================
	// Map Deletion Cascade
	// ============================================================================
	describe('Map Deletion Cascade', () => {
		it('deleting map cascades to stops, routes, shares, memberships, matrices, and jobs', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				// Create complete test data for cascade test
				const testMap = await createMap({ organization_id: organization.id });
				const testDriver = await createDriver({
					organization_id: organization.id
				});
				const testLocation = await createLocation({
					organization_id: organization.id
				});
				const testDepot = await createDepot({
					organization_id: organization.id,
					location_id: testLocation.id
				});

				const testStop = await createStop({
					organization_id: organization.id,
					map_id: testMap.id,
					location_id: testLocation.id
				});

				const testRoute = await createRoute({
					organization_id: organization.id,
					map_id: testMap.id,
					driver_id: testDriver.id,
					depot_id: testDepot.id
				});

				const testShare = await createRouteShare({
					organization_id: organization.id,
					route_id: testRoute.id
				});

				const testMembership = await createDriverMapMembership({
					organization_id: organization.id,
					driver_id: testDriver.id,
					map_id: testMap.id
				});

				const testMatrix = await createMatrix({
					organization_id: organization.id,
					map_id: testMap.id
				});

				const testJob = await createOptimizationJob({
					organization_id: organization.id,
					map_id: testMap.id,
					matrix_id: testMatrix.id,
					depot_id: testDepot.id
				});

				// Delete the map
				await mapService.deleteMap(testMap.id, organization.id);

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
			});
		});
	});

	// ============================================================================
	// Location Deletion Cascade
	// ============================================================================
	describe('Location Deletion Cascade', () => {
		it('deleting location cascades to stops and depot', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const testMap = await createMap({ organization_id: organization.id });
				const testLocation = await createLocation({
					organization_id: organization.id
				});

				const testStop = await createStop({
					organization_id: organization.id,
					map_id: testMap.id,
					location_id: testLocation.id
				});

				const testDepot = await createDepot({
					organization_id: organization.id,
					location_id: testLocation.id
				});

				// Delete the location
				await locationService.deleteLocation(testLocation.id, organization.id);

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
});
