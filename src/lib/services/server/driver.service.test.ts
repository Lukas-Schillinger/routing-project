import {
	createDriver,
	createLocation,
	createMap,
	createOrganization,
	createStop,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { describe, expect, it } from 'vitest';
import { driverService } from './driver.service';

/**
 * Driver Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('DriverService', () => {
	describe('getDrivers()', () => {
		it('returns all drivers for an organization', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver1 = await createDriver({
					organization_id: organization.id,
					name: 'Alice Driver',
					active: true
				});
				const driver2 = await createDriver({
					organization_id: organization.id,
					name: 'Bob Driver',
					active: false
				});

				const result = await driverService.getDrivers(organization.id);

				expect(result).toHaveLength(2);
				const driverIds = result.map((d) => d.id);
				expect(driverIds).toContain(driver1.id);
				expect(driverIds).toContain(driver2.id);
			});
		});

		it('returns drivers ordered by active (desc) then name', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				await createDriver({
					organization_id: organization.id,
					name: 'Zach',
					active: false
				});
				await createDriver({
					organization_id: organization.id,
					name: 'Alice',
					active: true
				});
				await createDriver({
					organization_id: organization.id,
					name: 'Bob',
					active: true
				});

				const result = await driverService.getDrivers(organization.id);

				expect(result[0].name).toBe('Alice');
				expect(result[0].active).toBe(true);
				expect(result[1].name).toBe('Bob');
				expect(result[1].active).toBe(true);
				expect(result[2].name).toBe('Zach');
				expect(result[2].active).toBe(false);
			});
		});

		it('returns empty array when no drivers exist', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();

				const result = await driverService.getDrivers(org.id);

				expect(result).toHaveLength(0);
			});
		});
	});

	describe('getDriverById()', () => {
		it('returns driver when found', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Test Driver'
				});

				const result = await driverService.getDriverById(
					driver.id,
					organization.id
				);

				expect(result.id).toBe(driver.id);
				expect(result.name).toBe('Test Driver');
				expect(result.organization_id).toBe(organization.id);
			});
		});

		it('throws NOT_FOUND when driver does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					driverService.getDriverById(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('createDriver()', () => {
		it('creates driver with all provided fields', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await driverService.createDriver(
					{
						name: 'New Driver',
						color: '#FF5733',
						phone: '555-1234',
						notes: 'Test notes',
						active: true,
						temporary: true
					},
					organization.id,
					user.id
				);

				expect(result.id).toBeDefined();
				expect(result.name).toBe('New Driver');
				expect(result.color).toBe('#FF5733');
				expect(result.phone).toBe('555-1234');
				expect(result.notes).toBe('Test notes');
				expect(result.active).toBe(true);
				expect(result.temporary).toBe(true);
			});
		});

		it('sets organization_id, created_by, updated_by correctly', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await driverService.createDriver(
					{
						name: 'Audit Test Driver',
						color: '#AABBCC',
						active: true,
						temporary: false
					},
					organization.id,
					user.id
				);

				expect(result.organization_id).toBe(organization.id);
				expect(result.created_by).toBe(user.id);
				expect(result.updated_by).toBe(user.id);
			});
		});

		it('trims the name field', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await driverService.createDriver(
					{
						name: '  Trimmed Name  ',
						color: '#123456',
						active: true,
						temporary: false
					},
					organization.id,
					user.id
				);

				expect(result.name).toBe('Trimmed Name');
			});
		});

		it('sets phone and notes to null when not provided', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await driverService.createDriver(
					{
						name: 'Minimal Driver',
						color: '#ABCDEF',
						active: true,
						temporary: false
					},
					organization.id,
					user.id
				);

				expect(result.phone).toBeNull();
				expect(result.notes).toBeNull();
			});
		});

		it('uses provided active and temporary values', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await driverService.createDriver(
					{
						name: 'Custom Flags Driver',
						color: '#112233',
						active: false,
						temporary: true
					},
					organization.id,
					user.id
				);

				expect(result.active).toBe(false);
				expect(result.temporary).toBe(true);
			});
		});

		it('returns the created driver with timestamps', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await driverService.createDriver(
					{
						name: 'Return Test',
						color: '#FEDCBA',
						active: true,
						temporary: false
					},
					organization.id,
					user.id
				);

				expect(result.id).toBeDefined();
				expect(result.created_at).toBeInstanceOf(Date);
				expect(result.updated_at).toBeInstanceOf(Date);
			});
		});
	});

	describe('updateDriver()', () => {
		it('updates driver name and trims it', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Original Name'
				});

				const result = await driverService.updateDriver(
					driver.id,
					{ name: '  Updated Name  ' },
					organization.id,
					user.id
				);

				expect(result.name).toBe('Updated Name');
			});
		});

		it('updates phone, notes, active, temporary, color fields', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					phone: '555-0000',
					notes: 'Original notes',
					active: true,
					temporary: false,
					color: '#000000'
				});

				const result = await driverService.updateDriver(
					driver.id,
					{
						phone: '555-9999',
						notes: 'Updated notes',
						active: false,
						temporary: true,
						color: '#FFFFFF'
					},
					organization.id,
					user.id
				);

				expect(result.phone).toBe('555-9999');
				expect(result.notes).toBe('Updated notes');
				expect(result.active).toBe(false);
				expect(result.temporary).toBe(true);
				expect(result.color).toBe('#FFFFFF');
			});
		});

		it('sets updated_at and updated_by correctly', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });
				const beforeUpdate = new Date();

				const result = await driverService.updateDriver(
					driver.id,
					{ notes: 'Timestamp test' },
					organization.id,
					user.id
				);

				expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(
					beforeUpdate.getTime()
				);
				expect(result.updated_by).toBe(user.id);
			});
		});

		it('throws NOT_FOUND for non-existent driver', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				await expect(
					driverService.updateDriver(
						NON_EXISTENT_UUID,
						{ name: 'Test' },
						organization.id,
						user.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('returns updated driver', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });

				const result = await driverService.updateDriver(
					driver.id,
					{ notes: 'Return test' },
					organization.id,
					user.id
				);

				expect(result.id).toBe(driver.id);
				expect(result.notes).toBe('Return test');
			});
		});
	});

	describe('deleteDriver()', () => {
		it('removes driver from database', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });

				await driverService.deleteDriver(driver.id, organization.id);

				await expect(
					driverService.getDriverById(driver.id, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('returns { success: true } on successful deletion', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({ organization_id: organization.id });

				const result = await driverService.deleteDriver(
					driver.id,
					organization.id
				);

				expect(result).toEqual({ success: true });
			});
		});

		it('throws NOT_FOUND for non-existent driver', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					driverService.deleteDriver(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws VALIDATION error when driver is assigned to stops', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const driver = await createDriver({
					organization_id: organization.id,
					name: 'Driver With Stop'
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: location.id,
					driver_id: driver.id
				});

				await expect(
					driverService.deleteDriver(driver.id, organization.id)
				).rejects.toMatchObject({
					code: 'VALIDATION',
					message: 'Drivers cannot be deleted when assigned to stops'
				});
			});
		});
	});
});
