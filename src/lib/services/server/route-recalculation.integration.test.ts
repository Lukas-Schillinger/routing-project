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
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { routeService } from './route.service';
import { stopService } from './stop.service';

vi.mock('$lib/services/external/mapbox/navigation', () => ({
	mapboxNavigation: {
		getDirections: vi.fn()
	}
}));

import { mapboxNavigation } from '$lib/services/external/mapbox/navigation';

let org: { id: string };
let user: { id: string };
let map: { id: string };
let driverA: { id: string };
let driverB: { id: string };
let depot: { id: string };
let depotLocation: { id: string };
let stopLocation1: { id: string };
let stopLocation2: { id: string };

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

	org = await createOrganization(tx, { name: 'Route Recalc Test Org' });
	createdOrgIds.push(org.id);

	user = await createUser(tx, { organization_id: org.id, role: 'admin' });
	createdUserIds.push(user.id);

	driverA = await createDriver(tx, {
		organization_id: org.id,
		name: 'Driver A'
	});
	driverB = await createDriver(tx, {
		organization_id: org.id,
		name: 'Driver B'
	});
	createdDriverIds.push(driverA.id, driverB.id);

	map = await createMap(tx, { organization_id: org.id, created_by: user.id });
	createdMapIds.push(map.id);

	depotLocation = await createLocation(tx, { organization_id: org.id });
	stopLocation1 = await createLocation(tx, { organization_id: org.id });
	stopLocation2 = await createLocation(tx, { organization_id: org.id });
	createdLocationIds.push(depotLocation.id, stopLocation1.id, stopLocation2.id);

	depot = await createDepot(tx, {
		organization_id: org.id,
		location_id: depotLocation.id,
		created_by: user.id,
		default_depot: true
	});
	createdDepotIds.push(depot.id);
});

beforeEach(async () => {
	vi.clearAllMocks();

	// Clean up routes and stops from previous test to avoid unique constraint violations
	await db.delete(routes).where(inArray(routes.map_id, createdMapIds));
	await db.delete(stops).where(inArray(stops.map_id, createdMapIds));

	vi.mocked(mapboxNavigation.getDirections).mockResolvedValue({
		code: 'Ok',
		routes: [
			{
				geometry: {
					type: 'LineString',
					coordinates: [
						[-81.95, 28.03],
						[-81.96, 28.04]
					]
				},
				duration: 600,
				distance: 2000,
				legs: []
			}
		],
		waypoints: []
	});
});

afterAll(async () => {
	if (createdRouteIds.length > 0) {
		await db.delete(routes).where(inArray(routes.id, createdRouteIds));
	}
	if (createdStopIds.length > 0) {
		await db.delete(stops).where(inArray(stops.id, createdStopIds));
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

describe('Route Recalculation', () => {
	describe('deleteStop', () => {
		it('recalculates route when assigned stop is deleted', async () => {
			const tx = db as unknown as TestTransaction;

			const route = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(route.id);

			const stop1 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(stop1.id);

			const stop2 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation2.id,
				driver_id: driverA.id,
				delivery_index: 1
			});
			createdStopIds.push(stop2.id);

			await stopService.deleteStop(stop1.id, org.id);

			expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
		});

		it('deletes route when last assigned stop is deleted', async () => {
			const tx = db as unknown as TestTransaction;

			const route = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(route.id);

			const stop = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(stop.id);

			await stopService.deleteStop(stop.id, org.id);

			const routeAfter = await routeService.getRouteByMapAndDriver(
				map.id,
				driverA.id,
				org.id
			);
			expect(routeAfter).toBeNull();
		});

		it('does not recalculate when unassigned stop is deleted', async () => {
			const tx = db as unknown as TestTransaction;

			const stop = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: null,
				delivery_index: null
			});
			createdStopIds.push(stop.id);

			await stopService.deleteStop(stop.id, org.id);

			expect(mapboxNavigation.getDirections).not.toHaveBeenCalled();
		});
	});

	describe('updateStop - location change', () => {
		it('recalculates route when assigned stop location changes', async () => {
			const tx = db as unknown as TestTransaction;

			const route = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(route.id);

			const stop = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(stop.id);

			await stopService.updateStop(
				stop.id,
				{ location_id: stopLocation2.id },
				org.id,
				user.id
			);

			expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
		});

		it('does not recalculate when only metadata changes', async () => {
			const tx = db as unknown as TestTransaction;

			const route = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(route.id);

			const stop = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(stop.id);

			await stopService.updateStop(
				stop.id,
				{ contact_name: 'New Name', contact_phone: '555-1234' },
				org.id,
				user.id
			);

			expect(mapboxNavigation.getDirections).not.toHaveBeenCalled();
		});

		it('does not recalculate when unassigned stop location changes', async () => {
			const tx = db as unknown as TestTransaction;

			const stop = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: null,
				delivery_index: null
			});
			createdStopIds.push(stop.id);

			await stopService.updateStop(
				stop.id,
				{ location_id: stopLocation2.id },
				org.id,
				user.id
			);

			expect(mapboxNavigation.getDirections).not.toHaveBeenCalled();
		});
	});

	describe('updateStop - driver assignment', () => {
		it('recalculates both routes when reassigning stop between drivers', async () => {
			const tx = db as unknown as TestTransaction;

			const routeA = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(routeA.id);

			const routeB = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverB.id,
				depot_id: depot.id
			});
			createdRouteIds.push(routeB.id);

			// Driver A needs 2 stops so route persists after reassignment
			const stopA1 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(stopA1.id);

			const stopA2 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation2.id,
				driver_id: driverA.id,
				delivery_index: 1
			});
			createdStopIds.push(stopA2.id);

			// Driver B needs at least 1 stop so route persists
			const newLocation = await createLocation(tx, { organization_id: org.id });
			createdLocationIds.push(newLocation.id);

			const stopB = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: newLocation.id,
				driver_id: driverB.id,
				delivery_index: 0
			});
			createdStopIds.push(stopB.id);

			// Reassign one of Driver A's stops to Driver B
			await stopService.updateStop(
				stopA1.id,
				{ driver_id: driverB.id },
				org.id,
				user.id
			);

			// Both drivers still have stops, so both routes should be recalculated
			expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(2);
		});

		it('recalculates route when assigning unassigned stop to driver', async () => {
			const tx = db as unknown as TestTransaction;

			const route = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(route.id);

			const existingStop = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(existingStop.id);

			const unassignedStop = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation2.id,
				driver_id: null,
				delivery_index: null
			});
			createdStopIds.push(unassignedStop.id);

			await stopService.updateStop(
				unassignedStop.id,
				{ driver_id: driverA.id, delivery_index: 1 },
				org.id,
				user.id
			);

			expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
		});

		it('recalculates route when unassigning stop from driver', async () => {
			const tx = db as unknown as TestTransaction;

			const route = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(route.id);

			const stop1 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(stop1.id);

			const stop2 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation2.id,
				driver_id: driverA.id,
				delivery_index: 1
			});
			createdStopIds.push(stop2.id);

			await stopService.updateStop(
				stop2.id,
				{ driver_id: null, delivery_index: null },
				org.id,
				user.id
			);

			expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
		});
	});

	describe('error handling', () => {
		it('sets geometry to null and throws on Mapbox failure', async () => {
			const tx = db as unknown as TestTransaction;

			const route = await createRoute(tx, {
				organization_id: org.id,
				map_id: map.id,
				driver_id: driverA.id,
				depot_id: depot.id
			});
			createdRouteIds.push(route.id);

			const stop1 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation1.id,
				driver_id: driverA.id,
				delivery_index: 0
			});
			createdStopIds.push(stop1.id);

			const stop2 = await createStop(tx, {
				organization_id: org.id,
				map_id: map.id,
				location_id: stopLocation2.id,
				driver_id: driverA.id,
				delivery_index: 1
			});
			createdStopIds.push(stop2.id);

			vi.mocked(mapboxNavigation.getDirections).mockRejectedValue(
				new Error('Mapbox API error')
			);

			await expect(stopService.deleteStop(stop1.id, org.id)).rejects.toThrow(
				'Error fetching mapbox API to recalculate route geometry'
			);

			const routeAfter = await routeService.getRouteByMapAndDriver(
				map.id,
				driverA.id,
				org.id
			);
			expect(routeAfter).not.toBeNull();
			expect(routeAfter?.geometry).toBeNull();
		});
	});
});
