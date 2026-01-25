import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, stops } from '$lib/server/db/schema';
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
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { mapService } from './map.service';

/**
 * Map Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 * Tests cover:
 * - CRUD operations
 * - Map duplication
 * - Cross-tenant validation (security)
 * - Driver assignment operations
 * - Reset optimization
 * - Audit trail fields
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('MapService', () => {
	describe('CRUD Operations', () => {
		describe('createMap()', () => {
			it('creates map with title', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();

					const result = await mapService.createMap(
						{ title: 'New Test Map' },
						organization.id,
						user.id
					);

					expect(result.map.id).toBeDefined();
					expect(result.map.title).toBe('New Test Map');
					expect(result.map.organization_id).toBe(organization.id);
					expect(result.stops).toBeNull();
				});
			});

			it('sets audit fields on create', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();

					const result = await mapService.createMap(
						{ title: 'Audit Test Map' },
						organization.id,
						user.id
					);

					expect(result.map.created_by).toBe(user.id);
					expect(result.map.updated_by).toBe(user.id);
				});
			});
		});

		describe('getMapById()', () => {
			it('returns map when found', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();
					const map = await createMap({
						organization_id: organization.id,
						title: 'Test Map'
					});

					const result = await mapService.getMapById(map.id, organization.id);

					expect(result.id).toBe(map.id);
					expect(result.organization_id).toBe(organization.id);
				});
			});

			it('throws NOT_FOUND for non-existent map', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();

					await expect(
						mapService.getMapById(NON_EXISTENT_UUID, organization.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			});
		});

		describe('getMaps()', () => {
			it('returns all maps for organization', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();
					const map = await createMap({
						organization_id: organization.id,
						title: 'Test Map'
					});

					const results = await mapService.getMaps(organization.id);

					expect(results.length).toBe(1);
					expect(results[0].id).toBe(map.id);
				});
			});

			it('does not return maps from other organizations', async () => {
				await withTestTransaction(async () => {
					const { organization: org1 } = await createTestEnvironment();
					const { organization: org2 } = await createTestEnvironment();
					const map1 = await createMap({ organization_id: org1.id });
					await createMap({ organization_id: org2.id });

					const results = await mapService.getMaps(org1.id);

					expect(results.length).toBe(1);
					expect(results[0].id).toBe(map1.id);
				});
			});
		});

		describe('updateMap()', () => {
			it('updates map title', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();
					const map = await createMap({
						organization_id: organization.id,
						title: 'Original'
					});

					const result = await mapService.updateMap(
						map.id,
						{ title: 'Updated Title' },
						organization.id,
						user.id
					);

					expect(result.title).toBe('Updated Title');
				});
			});

			it('updates updated_by on update', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();
					const map = await createMap({ organization_id: organization.id });

					const result = await mapService.updateMap(
						map.id,
						{ title: 'Updated' },
						organization.id,
						user.id
					);

					expect(result.updated_by).toBe(user.id);
				});
			});

			it('throws NOT_FOUND for non-existent map', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();

					await expect(
						mapService.updateMap(
							NON_EXISTENT_UUID,
							{ title: 'Updated' },
							organization.id,
							user.id
						)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			});
		});

		describe('deleteMap()', () => {
			it('removes map from database', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();
					const map = await createMap({ organization_id: organization.id });

					await mapService.deleteMap(map.id, organization.id);

					await expect(
						mapService.getMapById(map.id, organization.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			});

			it('throws NOT_FOUND for non-existent map', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();

					await expect(
						mapService.deleteMap(NON_EXISTENT_UUID, organization.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			});
		});
	});

	describe('Map Duplication', () => {
		it('duplicates map with default title', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const sourceMap = await createMap({
					organization_id: organization.id,
					title: 'Original Map'
				});

				const result = await mapService.duplicateMap(
					sourceMap.id,
					organization.id,
					user.id
				);

				expect(result.id).not.toBe(sourceMap.id);
				expect(result.title).toBe('Original Map (Copy)');
				expect(result.organization_id).toBe(organization.id);
			});
		});

		it('duplicates map with custom title', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const sourceMap = await createMap({ organization_id: organization.id });

				const result = await mapService.duplicateMap(
					sourceMap.id,
					organization.id,
					user.id,
					'Custom Copy Title'
				);

				expect(result.title).toBe('Custom Copy Title');
			});
		});

		it('duplicates map copies all stops', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });
				const location1 = await createLocation({
					organization_id: organization.id
				});
				const location2 = await createLocation({
					organization_id: organization.id
				});
				const sourceMap = await createMap({
					organization_id: organization.id,
					title: 'Source'
				});
				await createStop({
					organization_id: organization.id,
					map_id: sourceMap.id,
					location_id: location1.id,
					driver_id: driver.id,
					delivery_index: 1
				});
				await createStop({
					organization_id: organization.id,
					map_id: sourceMap.id,
					location_id: location2.id
				});

				const duplicated = await mapService.duplicateMap(
					sourceMap.id,
					organization.id,
					user.id,
					'Duplicated Map'
				);

				const duplicatedStops = await db
					.select()
					.from(stops)
					.where(eq(stops.map_id, duplicated.id));

				expect(duplicatedStops.length).toBe(2);
			});
		});

		it('duplicated map has no driver assignments', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });
				const location = await createLocation({
					organization_id: organization.id
				});
				const sourceMap = await createMap({ organization_id: organization.id });
				await createStop({
					organization_id: organization.id,
					map_id: sourceMap.id,
					location_id: location.id,
					driver_id: driver.id,
					delivery_index: 1
				});

				const duplicated = await mapService.duplicateMap(
					sourceMap.id,
					organization.id,
					user.id
				);

				const duplicatedStops = await db
					.select()
					.from(stops)
					.where(eq(stops.map_id, duplicated.id));

				expect(duplicatedStops.every((s) => s.driver_id === null)).toBe(true);
				expect(duplicatedStops.every((s) => s.delivery_index === null)).toBe(
					true
				);
			});
		});

		it('duplicated stops reference same locations', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const sourceMap = await createMap({ organization_id: organization.id });
				await createStop({
					organization_id: organization.id,
					map_id: sourceMap.id,
					location_id: location.id
				});

				const duplicated = await mapService.duplicateMap(
					sourceMap.id,
					organization.id,
					user.id
				);

				const duplicatedStops = await db
					.select()
					.from(stops)
					.where(eq(stops.map_id, duplicated.id));

				expect(duplicatedStops[0].location_id).toBe(location.id);
			});
		});
	});

	describe('Tenancy Isolation', () => {
		it('throws FORBIDDEN accessing map from another org', async () => {
			await withTestTransaction(async () => {
				const { organization: org1 } = await createTestEnvironment();
				const { organization: org2 } = await createTestEnvironment();
				const map = await createMap({ organization_id: org2.id });

				await expect(
					mapService.getMapById(map.id, org1.id)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });
			});
		});

		it('cannot update map from another org', async () => {
			await withTestTransaction(async () => {
				const { organization: org1, user: user1 } =
					await createTestEnvironment();
				const { organization: org2 } = await createTestEnvironment();
				const map = await createMap({ organization_id: org2.id });

				await expect(
					mapService.updateMap(map.id, { title: 'Hacked' }, org1.id, user1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('cannot delete map from another org', async () => {
			await withTestTransaction(async () => {
				const { organization: org1 } = await createTestEnvironment();
				const { organization: org2 } = await createTestEnvironment();
				const map = await createMap({ organization_id: org2.id });

				await expect(
					mapService.deleteMap(map.id, org1.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('getDriversForMap only returns org drivers', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });
				const map = await createMap({ organization_id: organization.id });

				await db.insert(driverMapMemberships).values({
					organization_id: organization.id,
					driver_id: driver.id,
					map_id: map.id
				});

				const results = await mapService.getDriversForMap(
					map.id,
					organization.id
				);

				expect(
					results.every((r) => r.driver.organization_id === organization.id)
				).toBe(true);
			});
		});

		it('getMapsForDriver only returns org maps', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });
				const map = await createMap({ organization_id: organization.id });

				await db.insert(driverMapMemberships).values({
					organization_id: organization.id,
					driver_id: driver.id,
					map_id: map.id
				});

				const results = await mapService.getMapsForDriver(
					driver.id,
					organization.id
				);

				expect(
					results.every((r) => r.map.organization_id === organization.id)
				).toBe(true);
			});
		});
	});

	describe('Driver Assignment', () => {
		it('adds driver to map', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const map = await createMap({ organization_id: organization.id });

				const result = await mapService.addDriverToMap(
					driver.id,
					map.id,
					organization.id
				);

				expect(result.driver_id).toBe(driver.id);
				expect(result.map_id).toBe(map.id);
			});
		});

		it('throws CONFLICT when adding driver already assigned', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const map = await createMap({ organization_id: organization.id });

				await mapService.addDriverToMap(driver.id, map.id, organization.id);

				await expect(
					mapService.addDriverToMap(driver.id, map.id, organization.id)
				).rejects.toMatchObject({ code: 'CONFLICT' });
			});
		});

		it('removes driver from map', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const map = await createMap({ organization_id: organization.id });

				await mapService.addDriverToMap(driver.id, map.id, organization.id);
				await mapService.removeDriverFromMap(
					driver.id,
					map.id,
					organization.id
				);

				const results = await mapService.getDriversForMap(
					map.id,
					organization.id
				);
				expect(results.some((r) => r.driver.id === driver.id)).toBe(false);
			});
		});

		it('throws NOT_FOUND removing unassigned driver', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const map = await createMap({ organization_id: organization.id });

				await expect(
					mapService.removeDriverFromMap(driver.id, map.id, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('deletes temporary driver when removed from map', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const tempDriver = await createDriver({
					organization_id: organization.id,
					temporary: true
				});
				const map = await createMap({ organization_id: organization.id });

				await mapService.addDriverToMap(tempDriver.id, map.id, organization.id);
				await mapService.removeDriverFromMap(
					tempDriver.id,
					map.id,
					organization.id
				);

				const remainingDrivers = await db
					.select()
					.from(drivers)
					.where(eq(drivers.id, tempDriver.id));
				expect(remainingDrivers.length).toBe(0);
			});
		});
	});

	describe('Reset Optimization', () => {
		it('clears driver assignments on reset', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });
				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				const stop = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					driver_id: driver.id,
					delivery_index: 1
				});

				await mapService.resetOptimization(map.id, organization.id, user.id);

				const [updatedStop] = await db
					.select()
					.from(stops)
					.where(eq(stops.id, stop.id));

				expect(updatedStop.driver_id).toBeNull();
				expect(updatedStop.delivery_index).toBeNull();
			});
		});

		it('deletes routes on reset', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});
				const map = await createMap({ organization_id: organization.id });
				const route = await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});

				await mapService.resetOptimization(map.id, organization.id, user.id);

				// Route should be deleted
				const remainingRoutes = await db.query.routes.findFirst({
					where: (routes, { eq }) => eq(routes.id, route.id)
				});

				expect(remainingRoutes).toBeUndefined();
			});
		});
	});

	describe('setMapDepot', () => {
		it('sets depot_id on map', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});
				const map = await createMap({ organization_id: organization.id });

				const result = await mapService.setMapDepot(
					map.id,
					depot.id,
					organization.id,
					user.id
				);

				expect(result.depot_id).toBe(depot.id);
			});
		});

		it('returns early when depot is unchanged', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});
				const map = await createMap({
					organization_id: organization.id,
					depot_id: depot.id
				});

				const result = await mapService.setMapDepot(
					map.id,
					depot.id,
					organization.id,
					user.id
				);

				expect(result.depot_id).toBe(depot.id);
			});
		});

		it('clears depot when set to null', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});
				const map = await createMap({
					organization_id: organization.id,
					depot_id: depot.id
				});

				const result = await mapService.setMapDepot(
					map.id,
					null,
					organization.id,
					user.id
				);

				expect(result.depot_id).toBeNull();
			});
		});

		it('throws FORBIDDEN for depot from another org', async () => {
			await withTestTransaction(async () => {
				const { organization: org1, user: user1 } =
					await createTestEnvironment();
				const { organization: org2 } = await createTestEnvironment();
				const location = await createLocation({ organization_id: org2.id });
				const depot = await createDepot({
					organization_id: org2.id,
					location_id: location.id
				});
				const map = await createMap({ organization_id: org1.id });

				await expect(
					mapService.setMapDepot(map.id, depot.id, org1.id, user1.id)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });
			});
		});
	});

	describe('duplicateMap with depot', () => {
		it('copies depot_id when duplicating', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});
				const sourceMap = await createMap({
					organization_id: organization.id,
					depot_id: depot.id
				});

				const duplicated = await mapService.duplicateMap(
					sourceMap.id,
					organization.id,
					user.id
				);

				expect(duplicated.depot_id).toBe(depot.id);
			});
		});
	});
});
