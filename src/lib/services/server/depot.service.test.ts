import { db } from '$lib/server/db';
import { depots } from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createOrganization,
	createRoute,
	createTestEnvironment,
	createUser,
	withTestTransaction
} from '$lib/testing';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { depotService } from './depot.service';

/**
 * Depot Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('DepotService', () => {
	describe('CRUD Operations', () => {
		describe('createDepot()', () => {
			it('creates depot with provided location', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();
					const location = await createLocation({
						organization_id: organization.id
					});

					const result = await depotService.createDepot(
						{
							name: 'Test Depot',
							location_id: location.id,
							default_depot: false
						},
						organization.id,
						user.id
					);

					expect(result.depot.name).toBe('Test Depot');
					expect(result.depot.location_id).toBe(location.id);
					expect(result.location).toBeDefined();
				});
			});

			it('sets audit fields on create', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();
					const location = await createLocation({
						organization_id: organization.id
					});

					const result = await depotService.createDepot(
						{
							name: 'Audit Test Depot',
							location_id: location.id,
							default_depot: false
						},
						organization.id,
						user.id
					);

					expect(result.depot.created_by).toBe(user.id);
					expect(result.depot.updated_by).toBe(user.id);
				});
			});
		});

		describe('getDepots()', () => {
			it('returns all depots for an organization', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();
					const location = await createLocation({
						organization_id: organization.id
					});
					const depot = await createDepot({
						organization_id: organization.id,
						location_id: location.id
					});

					const results = await depotService.getDepots(organization.id);

					expect(results.length).toBeGreaterThanOrEqual(1);
					expect(results.some((r) => r.depot.id === depot.id)).toBe(true);
				});
			});
		});

		describe('getDepotById()', () => {
			it('returns depot when found', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();
					const location = await createLocation({
						organization_id: organization.id
					});
					const depot = await createDepot({
						organization_id: organization.id,
						location_id: location.id
					});

					const result = await depotService.getDepotById(
						depot.id,
						organization.id
					);

					expect(result.depot.id).toBe(depot.id);
				});
			});

			it('throws NOT_FOUND for non-existent depot', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();

					await expect(
						depotService.getDepotById(NON_EXISTENT_UUID, organization.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			});

			it('throws FORBIDDEN for depot in different organization', async () => {
				await withTestTransaction(async () => {
					const { organization } = await createTestEnvironment();
					const otherOrg = await createOrganization();
					const location = await createLocation({
						organization_id: otherOrg.id
					});
					const depot = await createDepot({
						organization_id: otherOrg.id,
						location_id: location.id
					});

					await expect(
						depotService.getDepotById(depot.id, organization.id)
					).rejects.toMatchObject({ code: 'FORBIDDEN' });
				});
			});
		});

		describe('updateDepot()', () => {
			it('updates depot name', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();
					const location = await createLocation({
						organization_id: organization.id
					});
					const depot = await createDepot({
						organization_id: organization.id,
						location_id: location.id,
						name: 'Original Name'
					});

					const result = await depotService.updateDepot(
						depot.id,
						{ name: 'Updated Name' },
						organization.id,
						user.id
					);

					expect(result.depot.name).toBe('Updated Name');
				});
			});

			it('sets updated_by on update', async () => {
				await withTestTransaction(async () => {
					const { organization, user } = await createTestEnvironment();
					const secondUser = await createUser({
						organization_id: organization.id,
						role: 'member'
					});
					const location = await createLocation({
						organization_id: organization.id
					});
					const depot = await createDepot({
						organization_id: organization.id,
						location_id: location.id,
						created_by: user.id,
						updated_by: user.id
					});

					const result = await depotService.updateDepot(
						depot.id,
						{ name: 'New Name' },
						organization.id,
						secondUser.id
					);

					expect(result.depot.updated_by).toBe(secondUser.id);
				});
			});
		});

		describe('deleteDepot()', () => {
			it('deletes depot successfully', async () => {
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

					await expect(
						depotService.getDepotById(depot.id, organization.id)
					).rejects.toMatchObject({ code: 'NOT_FOUND' });
				});
			});

			it('throws VALIDATION when depot is used in routes', async () => {
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
						organization_id: organization.id,
						active: true
					});
					await createRoute({
						organization_id: organization.id,
						map_id: map.id,
						driver_id: driver.id,
						depot_id: depot.id
					});

					await expect(
						depotService.deleteDepot(depot.id, organization.id)
					).rejects.toMatchObject({ code: 'VALIDATION' });
				});
			});
		});
	});

	describe('getDefaultDepot()', () => {
		it('returns default depot when one exists', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				const depot = await depotService.createDepot(
					{
						name: 'Default Depot',
						location_id: location.id,
						default_depot: true
					},
					organization.id,
					user.id
				);

				const result = await depotService.getDefaultDepot(organization.id);

				expect(result).not.toBeNull();
				expect(result!.depot.id).toBe(depot.depot.id);
				expect(result!.depot.default_depot).toBe(true);
			});
		});

		it('returns null when no default depot exists', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				await depotService.createDepot(
					{
						name: 'Non-default Depot',
						location_id: location.id,
						default_depot: false
					},
					organization.id,
					user.id
				);

				const result = await depotService.getDefaultDepot(organization.id);

				expect(result).toBeNull();
			});
		});

		it('returns null for organization with no depots', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const result = await depotService.getDefaultDepot(organization.id);

				expect(result).toBeNull();
			});
		});

		it('only returns default depot from same organization', async () => {
			await withTestTransaction(async () => {
				const { organization: org1 } = await createTestEnvironment();
				const { organization: org2, user: user2 } =
					await createTestEnvironment();
				const location = await createLocation({ organization_id: org2.id });

				await depotService.createDepot(
					{
						name: 'Org2 Default',
						location_id: location.id,
						default_depot: true
					},
					org2.id,
					user2.id
				);

				const result = await depotService.getDefaultDepot(org1.id);

				expect(result).toBeNull();
			});
		});
	});

	describe('Default Depot Management (unsetDefaultDepot)', () => {
		it('unsets other default depots when creating a new default depot', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const loc1 = await createLocation({ organization_id: organization.id });
				const loc2 = await createLocation({ organization_id: organization.id });

				const depot1 = await depotService.createDepot(
					{
						name: 'First Default Depot',
						location_id: loc1.id,
						default_depot: true
					},
					organization.id,
					user.id
				);

				expect(depot1.depot.default_depot).toBe(true);

				const depot2 = await depotService.createDepot(
					{
						name: 'Second Default Depot',
						location_id: loc2.id,
						default_depot: true
					},
					organization.id,
					user.id
				);

				expect(depot2.depot.default_depot).toBe(true);

				const [updatedDepot1] = await db
					.select()
					.from(depots)
					.where(eq(depots.id, depot1.depot.id))
					.limit(1);

				expect(updatedDepot1.default_depot).toBe(false);
			});
		});

		it('unsets other default depots when updating a depot to default', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const loc1 = await createLocation({ organization_id: organization.id });
				const loc2 = await createLocation({ organization_id: organization.id });

				const depot1 = await depotService.createDepot(
					{
						name: 'First Depot',
						location_id: loc1.id,
						default_depot: true
					},
					organization.id,
					user.id
				);

				const depot2 = await depotService.createDepot(
					{
						name: 'Second Depot',
						location_id: loc2.id,
						default_depot: false
					},
					organization.id,
					user.id
				);

				const result = await depotService.updateDepot(
					depot2.depot.id,
					{ default_depot: true },
					organization.id,
					user.id
				);

				expect(result.depot.default_depot).toBe(true);

				const [updatedDepot1] = await db
					.select()
					.from(depots)
					.where(eq(depots.id, depot1.depot.id))
					.limit(1);

				expect(updatedDepot1.default_depot).toBe(false);
			});
		});

		it('only affects depots in the same organization', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const otherOrg = await createOrganization();
				const otherUser = await createUser({
					organization_id: otherOrg.id,
					role: 'admin'
				});

				const loc1 = await createLocation({ organization_id: organization.id });
				const loc2 = await createLocation({ organization_id: otherOrg.id });

				const depot1 = await depotService.createDepot(
					{
						name: 'Org1 Default Depot',
						location_id: loc1.id,
						default_depot: true
					},
					organization.id,
					user.id
				);

				const depot2 = await depotService.createDepot(
					{
						name: 'Org2 Default Depot',
						location_id: loc2.id,
						default_depot: true
					},
					otherOrg.id,
					otherUser.id
				);

				const [org1Depot] = await db
					.select()
					.from(depots)
					.where(eq(depots.id, depot1.depot.id))
					.limit(1);

				expect(org1Depot.default_depot).toBe(true);

				const [org2Depot] = await db
					.select()
					.from(depots)
					.where(eq(depots.id, depot2.depot.id))
					.limit(1);

				expect(org2Depot.default_depot).toBe(true);
			});
		});

		it('preserves other depot properties when unsetting default', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const loc1 = await createLocation({ organization_id: organization.id });
				const loc2 = await createLocation({ organization_id: organization.id });

				const depot1 = await depotService.createDepot(
					{
						name: 'Original Depot Name',
						location_id: loc1.id,
						default_depot: true
					},
					organization.id,
					user.id
				);

				const originalCreatedAt = depot1.depot.created_at;
				const originalCreatedBy = depot1.depot.created_by;
				const originalName = depot1.depot.name;

				await depotService.createDepot(
					{
						name: 'New Default Depot',
						location_id: loc2.id,
						default_depot: true
					},
					organization.id,
					user.id
				);

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
});
