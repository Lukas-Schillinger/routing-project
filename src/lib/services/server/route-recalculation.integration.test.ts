import {
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createRoute,
	createStop,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeService } from './route.service';
import { stopService } from './stop.service';

vi.mock('$lib/services/external/mapbox/navigation', () => ({
	mapboxNavigation: {
		getDirections: vi.fn()
	}
}));

import { mapboxNavigation } from '$lib/services/external/mapbox/navigation';

beforeEach(() => {
	vi.clearAllMocks();

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

describe('Route Recalculation', () => {
	describe('deleteStop', () => {
		it('recalculates route when assigned stop is deleted', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driverA = await createDriver({
					organization_id: organization.id,
					name: 'Driver A'
				});
				const map = await createMap({ organization_id: organization.id });
				const depotLocation = await createLocation({
					organization_id: organization.id
				});
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const stopLocation2 = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: depotLocation.id,
					default_depot: true
				});

				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driverA.id,
					depot_id: depot.id
				});

				const stop1 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driverA.id,
					delivery_index: 0
				});

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation2.id,
					driver_id: driverA.id,
					delivery_index: 1
				});

				await stopService.deleteStop(stop1.id, organization.id);

				expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
			});
		});

		it('deletes route when last assigned stop is deleted', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driverA = await createDriver({
					organization_id: organization.id,
					name: 'Driver A'
				});
				const map = await createMap({ organization_id: organization.id });
				const depotLocation = await createLocation({
					organization_id: organization.id
				});
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: depotLocation.id,
					default_depot: true
				});

				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driverA.id,
					depot_id: depot.id
				});

				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driverA.id,
					delivery_index: 0
				});

				await stopService.deleteStop(stop.id, organization.id);

				const routeAfter = await routeService.getRouteByMapAndDriver(
					map.id,
					driverA.id,
					organization.id
				);
				expect(routeAfter).toBeNull();
			});
		});

		it('does not recalculate when unassigned stop is deleted', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const map = await createMap({ organization_id: organization.id });
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});

				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: null,
					delivery_index: null
				});

				await stopService.deleteStop(stop.id, organization.id);

				expect(mapboxNavigation.getDirections).not.toHaveBeenCalled();
			});
		});
	});

	describe('updateStop - location change', () => {
		it('recalculates route when assigned stop location changes', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driverA = await createDriver({
					organization_id: organization.id,
					name: 'Driver A'
				});
				const map = await createMap({ organization_id: organization.id });
				const depotLocation = await createLocation({
					organization_id: organization.id
				});
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const stopLocation2 = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: depotLocation.id,
					default_depot: true
				});

				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driverA.id,
					depot_id: depot.id
				});

				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driverA.id,
					delivery_index: 0
				});

				await stopService.updateStop(
					stop.id,
					{ location_id: stopLocation2.id },
					organization.id,
					user.id
				);

				expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
			});
		});

		it('does not recalculate when only metadata changes', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driverA = await createDriver({
					organization_id: organization.id,
					name: 'Driver A'
				});
				const map = await createMap({ organization_id: organization.id });
				const depotLocation = await createLocation({
					organization_id: organization.id
				});
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: depotLocation.id,
					default_depot: true
				});

				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driverA.id,
					depot_id: depot.id
				});

				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driverA.id,
					delivery_index: 0
				});

				await stopService.updateStop(
					stop.id,
					{ contact_name: 'New Name', contact_phone: '555-1234' },
					organization.id,
					user.id
				);

				expect(mapboxNavigation.getDirections).not.toHaveBeenCalled();
			});
		});

		it('does not recalculate when unassigned stop location changes', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({ organization_id: organization.id });
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const stopLocation2 = await createLocation({
					organization_id: organization.id
				});

				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: null,
					delivery_index: null
				});

				await stopService.updateStop(
					stop.id,
					{ location_id: stopLocation2.id },
					organization.id,
					user.id
				);

				expect(mapboxNavigation.getDirections).not.toHaveBeenCalled();
			});
		});
	});

	describe('updateStop - driver assignment', () => {
		it(
			'recalculates both routes when reassigning stop between drivers',
			{ timeout: 10000 },
			async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();
					const driverA = await createDriver({
						organization_id: organization.id,
						name: 'Driver A'
					});
					const driverB = await createDriver({
						organization_id: organization.id,
						name: 'Driver B'
					});
					const map = await createMap({ organization_id: organization.id });
					const depotLocation = await createLocation({
						organization_id: organization.id
					});
					const stopLocation1 = await createLocation({
						organization_id: organization.id
					});
					const stopLocation2 = await createLocation({
						organization_id: organization.id
					});
					const depot = await createDepot({
						organization_id: organization.id,
						location_id: depotLocation.id,
						default_depot: true
					});

					await createRoute({
						organization_id: organization.id,
						map_id: map.id,
						driver_id: driverA.id,
						depot_id: depot.id
					});

					await createRoute({
						organization_id: organization.id,
						map_id: map.id,
						driver_id: driverB.id,
						depot_id: depot.id
					});

					// Driver A needs 2 stops so route persists after reassignment
					const stopA1 = await createStop({
						organization_id: organization.id,
						map_id: map.id,
						location_id: stopLocation1.id,
						driver_id: driverA.id,
						delivery_index: 0
					});

					await createStop({
						organization_id: organization.id,
						map_id: map.id,
						location_id: stopLocation2.id,
						driver_id: driverA.id,
						delivery_index: 1
					});

					// Driver B needs at least 1 stop so route persists
					const newLocation = await createLocation({
						organization_id: organization.id
					});

					await createStop({
						organization_id: organization.id,
						map_id: map.id,
						location_id: newLocation.id,
						driver_id: driverB.id,
						delivery_index: 0
					});

					// Reassign one of Driver A's stops to Driver B
					await stopService.updateStop(
						stopA1.id,
						{ driver_id: driverB.id },
						organization.id,
						user.id
					);

					// Both drivers still have stops, so both routes should be recalculated
					expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(2);
				});
			}
		);

		it('recalculates route when assigning unassigned stop to driver', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driverA = await createDriver({
					organization_id: organization.id,
					name: 'Driver A'
				});
				const map = await createMap({ organization_id: organization.id });
				const depotLocation = await createLocation({
					organization_id: organization.id
				});
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const stopLocation2 = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: depotLocation.id,
					default_depot: true
				});

				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driverA.id,
					depot_id: depot.id
				});

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driverA.id,
					delivery_index: 0
				});

				const unassignedStop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation2.id,
					driver_id: null,
					delivery_index: null
				});

				await stopService.updateStop(
					unassignedStop.id,
					{ driver_id: driverA.id, delivery_index: 1 },
					organization.id,
					user.id
				);

				expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
			});
		});

		it('recalculates route when unassigning stop from driver', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driverA = await createDriver({
					organization_id: organization.id,
					name: 'Driver A'
				});
				const map = await createMap({ organization_id: organization.id });
				const depotLocation = await createLocation({
					organization_id: organization.id
				});
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const stopLocation2 = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: depotLocation.id,
					default_depot: true
				});

				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driverA.id,
					depot_id: depot.id
				});

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driverA.id,
					delivery_index: 0
				});

				const stop2 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation2.id,
					driver_id: driverA.id,
					delivery_index: 1
				});

				await stopService.updateStop(
					stop2.id,
					{ driver_id: null, delivery_index: null },
					organization.id,
					user.id
				);

				expect(mapboxNavigation.getDirections).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe('error handling', () => {
		it('sets geometry to null and throws on Mapbox failure', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driverA = await createDriver({
					organization_id: organization.id,
					name: 'Driver A'
				});
				const map = await createMap({ organization_id: organization.id });
				const depotLocation = await createLocation({
					organization_id: organization.id
				});
				const stopLocation1 = await createLocation({
					organization_id: organization.id
				});
				const stopLocation2 = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: depotLocation.id,
					default_depot: true
				});

				await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driverA.id,
					depot_id: depot.id
				});

				const stop1 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driverA.id,
					delivery_index: 0
				});

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation2.id,
					driver_id: driverA.id,
					delivery_index: 1
				});

				vi.mocked(mapboxNavigation.getDirections).mockRejectedValue(
					new Error('Mapbox API error')
				);

				await expect(
					stopService.deleteStop(stop1.id, organization.id)
				).rejects.toThrow(
					'Error fetching mapbox API to recalculate route geometry'
				);

				const routeAfter = await routeService.getRouteByMapAndDriver(
					map.id,
					driverA.id,
					organization.id
				);
				expect(routeAfter).not.toBeNull();
				expect(routeAfter?.geometry).toBeNull();
			});
		});
	});
});
