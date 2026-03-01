import type { LocationCreate } from '$lib/schemas/location';
import {
	createDriver,
	createLocation,
	createMap,
	createMockLocation,
	createStop,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { stopService } from './stop.service';

// Mock route service to avoid actual route calculations
vi.mock('./route.service', () => ({
	routeService: {
		recalculateRouteForDriver: vi.fn().mockResolvedValue(undefined)
	}
}));

import { routeService } from './route.service';

/**
 * Stop Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 * Route recalculation is mocked to focus on stop service logic.
 */

// Valid UUID format that won't exist in the database
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('StopService', () => {
	describe('getStops()', () => {
		it('returns all stops for an organization', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location1 = await createLocation({
					organization_id: organization.id
				});
				const location2 = await createLocation({
					organization_id: organization.id
				});
				const stop1 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location1.id,
					created_by: user.id
				});
				const stop2 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location2.id,
					created_by: user.id
				});

				const result = await stopService.getStops(organization.id);

				expect(result.length).toBe(2);
				const stopIds = result.map((s) => s.id);
				expect(stopIds).toContain(stop1.id);
				expect(stopIds).toContain(stop2.id);
			});
		});

		it('returns empty array when no stops exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const result = await stopService.getStops(organization.id);

				expect(result).toHaveLength(0);
			});
		});
	});

	describe('getStopsWithLocation()', () => {
		it('returns stops with joined location data', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					created_by: user.id
				});

				const result = await stopService.getStopsWithLocation(organization.id);

				expect(result.length).toBe(1);
				const found = result.find((r) => r.stop.id === stop.id);
				expect(found).toBeDefined();
				expect(found!.location).toBeDefined();
				expect(found!.location.id).toBe(location.id);
			});
		});
	});

	describe('getStopsByMap()', () => {
		it('returns all stops for a map with location data', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location1 = await createLocation({
					organization_id: organization.id
				});
				const location2 = await createLocation({
					organization_id: organization.id
				});
				const stop1 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location1.id,
					created_by: user.id
				});
				const stop2 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location2.id,
					created_by: user.id
				});

				const result = await stopService.getStopsByMap(map.id, organization.id);

				expect(result.length).toBe(2);
				const stopIds = result.map((r) => r.stop.id);
				expect(stopIds).toContain(stop1.id);
				expect(stopIds).toContain(stop2.id);
			});
		});

		it('filters by driverId when provided', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Test Driver'
				});
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location1 = await createLocation({
					organization_id: organization.id
				});
				const location2 = await createLocation({
					organization_id: organization.id
				});
				const stopWithDriver = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location1.id,
					driver_id: driver.id,
					delivery_index: 1,
					created_by: user.id
				});
				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location2.id,
					created_by: user.id
				});

				const result = await stopService.getStopsByMap(
					map.id,
					organization.id,
					driver.id
				);

				expect(result.length).toBe(1);
				expect(result[0].stop.id).toBe(stopWithDriver.id);
				expect(result[0].stop.driver_id).toBe(driver.id);
			});
		});

		it('throws NOT_FOUND when map does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					stopService.getStopsByMap(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws NOT_FOUND when map belongs to different organization', async () => {
			await withTestTransaction(async () => {
				const { organization: org1, user } = await createTestEnvironment();
				const { organization: org2 } = await createTestEnvironment();
				const map = await createMap({
					organization_id: org1.id,
					created_by: user.id
				});

				await expect(
					stopService.getStopsByMap(map.id, org2.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('getStopsForRoute()', () => {
		it('returns only stops with delivery_index assigned', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Test Driver'
				});
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location1 = await createLocation({
					organization_id: organization.id
				});
				const location2 = await createLocation({
					organization_id: organization.id
				});
				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location1.id,
					driver_id: driver.id,
					delivery_index: 1,
					created_by: user.id
				});
				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location2.id,
					created_by: user.id
				});

				const result = await stopService.getStopsForRoute(
					map.id,
					driver.id,
					organization.id
				);

				expect(result.length).toBe(1);
				result.forEach((r) => {
					expect(r.stop.delivery_index).not.toBeNull();
					expect(r.stop.driver_id).toBe(driver.id);
				});
			});
		});

		it('returns empty array when no routed stops exist', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Test Driver'
				});
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});

				const result = await stopService.getStopsForRoute(
					map.id,
					driver.id,
					organization.id
				);

				expect(result).toHaveLength(0);
			});
		});
	});

	describe('getStopById()', () => {
		it('returns stop with location data', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					created_by: user.id
				});

				const result = await stopService.getStopById(stop.id, organization.id);

				expect(result.stop.id).toBe(stop.id);
				expect(result.location).toBeDefined();
				expect(result.location.id).toBe(location.id);
			});
		});

		it('throws NOT_FOUND when stop does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					stopService.getStopById(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws FORBIDDEN when stop belongs to different organization', async () => {
			await withTestTransaction(async () => {
				const { organization: org1, user } = await createTestEnvironment();
				const { organization: org2 } = await createTestEnvironment();
				const map = await createMap({
					organization_id: org1.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: org1.id
				});
				const stop = await createStop({
					organization_id: org1.id,
					map_id: map.id,
					location_id: location.id,
					created_by: user.id
				});

				await expect(
					stopService.getStopById(stop.id, org2.id)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });
			});
		});
	});

	describe('createStop()', () => {
		it('creates stop with existing location_id', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});

				const result = await stopService.createStop(
					{
						map_id: map.id,
						location_id: location.id,
						contact_name: 'Test Contact',
						contact_phone: '555-1234',
						notes: 'Test notes'
					},
					organization.id,
					user.id
				);

				expect(result.stop.id).toBeDefined();
				expect(result.stop.organization_id).toBe(organization.id);
				expect(result.stop.map_id).toBe(map.id);
				expect(result.stop.location_id).toBe(location.id);
				expect(result.stop.contact_name).toBe('Test Contact');
				expect(result.stop.contact_phone).toBe('555-1234');
				expect(result.stop.notes).toBe('Test notes');
			});
		});

		it('preserves delivery_index of 0', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});

				const result = await stopService.createStop(
					{
						map_id: map.id,
						location_id: location.id,
						delivery_index: 0
					},
					organization.id,
					user.id
				);

				expect(result.stop.delivery_index).toBe(0);
			});
		});

		it('creates stop with inline location data', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const locationData = createMockLocation({
					organization_id: organization.id
				}) as LocationCreate;

				const result = await stopService.createStop(
					{
						map_id: map.id,
						location: locationData,
						contact_name: 'Inline Location Test'
					},
					organization.id,
					user.id
				);

				expect(result.stop.id).toBeDefined();
				expect(result.location.address_line_1).toBe(
					locationData.address_line_1
				);
			});
		});

		it('sets audit fields correctly', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});

				const result = await stopService.createStop(
					{
						map_id: map.id,
						location_id: location.id
					},
					organization.id,
					user.id
				);

				expect(result.stop.created_by).toBe(user.id);
				expect(result.stop.updated_by).toBe(user.id);
			});
		});

		it('throws VALIDATION when neither location_id nor location data is provided', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});

				await expect(
					stopService.createStop({ map_id: map.id }, organization.id, user.id)
				).rejects.toMatchObject({ code: 'VALIDATION' });
			});
		});

		it('throws NOT_FOUND for invalid map', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				await expect(
					stopService.createStop(
						{
							map_id: NON_EXISTENT_UUID,
							location_id: location.id
						},
						organization.id,
						user.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('updateStop()', () => {
		it('updates stop fields', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					created_by: user.id
				});

				const result = await stopService.updateStop(
					stop.id,
					{
						contact_name: 'Updated Name',
						contact_phone: '999-8888',
						notes: 'Updated notes'
					},
					organization.id,
					user.id
				);

				expect(result.stop.contact_name).toBe('Updated Name');
				expect(result.stop.contact_phone).toBe('999-8888');
				expect(result.stop.notes).toBe('Updated notes');
				expect(result.stop.updated_by).toBe(user.id);
			});
		});

		it('triggers route recalculation when driver changes', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver1 = await createDriver({
					organization_id: organization.id,
					name: 'Driver 1'
				});
				const driver2 = await createDriver({
					organization_id: organization.id,
					name: 'Driver 2'
				});
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					driver_id: driver1.id,
					created_by: user.id
				});

				await stopService.updateStop(
					stop.id,
					{ driver_id: driver2.id },
					organization.id,
					user.id
				);

				expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
					map.id,
					driver1.id,
					organization.id
				);
				expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
					map.id,
					driver2.id,
					organization.id
				);
			});
		});

		it('triggers route recalculation when driver is removed (set to null)', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Test Driver'
				});
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					driver_id: driver.id,
					created_by: user.id
				});

				await stopService.updateStop(
					stop.id,
					{ driver_id: null },
					organization.id,
					user.id
				);

				expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
					map.id,
					driver.id,
					organization.id
				);
			});
		});

		it('does not trigger route recalculation when driver stays the same', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Test Driver'
				});
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					driver_id: driver.id,
					created_by: user.id
				});

				await stopService.updateStop(
					stop.id,
					{ contact_name: 'No driver change' },
					organization.id,
					user.id
				);

				expect(routeService.recalculateRouteForDriver).not.toHaveBeenCalled();
			});
		});

		it('throws NOT_FOUND for non-existent stop', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				await expect(
					stopService.updateStop(
						NON_EXISTENT_UUID,
						{ contact_name: 'Test' },
						organization.id,
						user.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('deleteStop()', () => {
		it('deletes stop and returns success', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					created_by: user.id
				});

				const result = await stopService.deleteStop(stop.id, organization.id);

				expect(result).toEqual({ success: true });

				await expect(
					stopService.getStopById(stop.id, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('triggers route recalculation when deleted stop had a driver', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Test Driver'
				});
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					driver_id: driver.id,
					created_by: user.id
				});

				await stopService.deleteStop(stop.id, organization.id);

				expect(routeService.recalculateRouteForDriver).toHaveBeenCalledWith(
					map.id,
					driver.id,
					organization.id
				);
			});
		});

		it('does not trigger route recalculation when deleted stop had no driver', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					created_by: user.id
				});

				await stopService.deleteStop(stop.id, organization.id);

				expect(routeService.recalculateRouteForDriver).not.toHaveBeenCalled();
			});
		});

		it('throws NOT_FOUND for non-existent stop', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					stopService.deleteStop(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws FORBIDDEN for stop from different organization', async () => {
			await withTestTransaction(async () => {
				const { organization: org1, user } = await createTestEnvironment();
				const { organization: org2 } = await createTestEnvironment();
				const map = await createMap({
					organization_id: org1.id,
					created_by: user.id
				});
				const location = await createLocation({
					organization_id: org1.id
				});
				const stop = await createStop({
					organization_id: org1.id,
					map_id: map.id,
					location_id: location.id,
					created_by: user.id
				});

				await expect(
					stopService.deleteStop(stop.id, org2.id)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });

				// Verify stop was NOT deleted
				const retrieved = await stopService.getStopById(stop.id, org1.id);
				expect(retrieved.stop.id).toBe(stop.id);
			});
		});
	});

	describe('bulkCreateStops()', () => {
		it('creates multiple stops for a map', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const location1 = await createLocation({
					organization_id: organization.id
				});
				const location2 = await createLocation({
					organization_id: organization.id
				});

				const result = await stopService.bulkCreateStops(
					[
						{ location_id: location1.id, contact_name: 'Bulk 1' },
						{ location_id: location2.id, contact_name: 'Bulk 2' }
					],
					map.id,
					organization.id,
					user.id
				);

				expect(result).toHaveLength(2);
				result.forEach((r) => {
					expect(r.stop.map_id).toBe(map.id);
					expect(r.stop.organization_id).toBe(organization.id);
				});
			});
		});

		it('throws NOT_FOUND for invalid map', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				await expect(
					stopService.bulkCreateStops(
						[{ location_id: location.id }],
						NON_EXISTENT_UUID,
						organization.id,
						user.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});
});
