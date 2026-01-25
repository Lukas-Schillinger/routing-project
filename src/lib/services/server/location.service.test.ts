import type { LocationCreate } from '$lib/schemas/location';
import {
	createLocation,
	createMockLocation,
	createOrganization,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { describe, expect, it } from 'vitest';
import { locationService } from './location.service';

/**
 * Location Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('LocationService', () => {
	describe('getLocations()', () => {
		it('returns all locations for an organization', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location1 = await createLocation({
					organization_id: organization.id
				});
				const location2 = await createLocation({
					organization_id: organization.id
				});

				const result = await locationService.getLocations(organization.id);

				expect(result).toHaveLength(2);
				const locationIds = result.map((l) => l.id);
				expect(locationIds).toContain(location1.id);
				expect(locationIds).toContain(location2.id);
			});
		});

		it('returns empty array when no locations exist', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();

				const result = await locationService.getLocations(org.id);

				expect(result).toHaveLength(0);
			});
		});

		it('does not return locations from other organizations', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const otherOrg = await createOrganization();
				const location = await createLocation({
					organization_id: organization.id
				});

				const result = await locationService.getLocations(otherOrg.id);

				expect(result.map((l) => l.id)).not.toContain(location.id);
			});
		});
	});

	describe('getLocationById()', () => {
		it('returns location when found', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				const result = await locationService.getLocationById(
					location.id,
					organization.id
				);

				expect(result.id).toBe(location.id);
				expect(result.organization_id).toBe(organization.id);
			});
		});

		it('throws NOT_FOUND when location does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					locationService.getLocationById(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws FORBIDDEN when location belongs to different organization', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const otherOrg = await createOrganization();
				const location = await createLocation({
					organization_id: organization.id
				});

				await expect(
					locationService.getLocationById(location.id, otherOrg.id)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });
			});
		});
	});

	describe('createLocation()', () => {
		it('creates location with all provided fields', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const locationData = createMockLocation() as LocationCreate;

				const result = await locationService.createLocation(
					locationData,
					organization.id,
					user.id
				);

				expect(result.id).toBeDefined();
				expect(result.organization_id).toBe(organization.id);
				expect(result.address_line_1).toBe(locationData.address_line_1);
				expect(result.lat).toBe(locationData.lat);
				expect(result.lon).toBe(locationData.lon);
			});
		});

		it('sets created_by and updated_by correctly', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const locationData = createMockLocation() as LocationCreate;

				const result = await locationService.createLocation(
					locationData,
					organization.id,
					user.id
				);

				expect(result.created_by).toBe(user.id);
				expect(result.updated_by).toBe(user.id);
			});
		});

		it('sets created_at and updated_at timestamps', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const locationData = createMockLocation() as LocationCreate;

				const result = await locationService.createLocation(
					locationData,
					organization.id,
					user.id
				);

				// Verify timestamps are set and are valid dates
				expect(result.created_at).toBeInstanceOf(Date);
				expect(result.updated_at).toBeInstanceOf(Date);
				expect(result.created_at.getTime()).toBeLessThanOrEqual(Date.now());
				expect(result.updated_at.getTime()).toBeLessThanOrEqual(Date.now());
			});
		});
	});

	describe('verifyLocationOwnership()', () => {
		it('returns location when ownership is valid', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				const result = await locationService.verifyLocationOwnership(
					location.id,
					organization.id
				);

				expect(result.id).toBe(location.id);
				expect(result.organization_id).toBe(organization.id);
			});
		});

		it('throws NOT_FOUND when location does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					locationService.verifyLocationOwnership(
						NON_EXISTENT_UUID,
						organization.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws FORBIDDEN when location belongs to different organization', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const otherOrg = await createOrganization();
				const location = await createLocation({
					organization_id: organization.id
				});

				await expect(
					locationService.verifyLocationOwnership(location.id, otherOrg.id)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });
			});
		});
	});

	describe('createOrVerifyLocation()', () => {
		it('creates new location when location data is provided', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const locationData = createMockLocation() as LocationCreate;

				const resultId = await locationService.createOrVerifyLocation(
					undefined,
					locationData,
					organization.id,
					user.id
				);

				expect(resultId).toBeDefined();

				const location = await locationService.getLocationById(
					resultId,
					organization.id
				);
				expect(location.address_line_1).toBe(locationData.address_line_1);
			});
		});

		it('verifies existing location when location_id is provided', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				const resultId = await locationService.createOrVerifyLocation(
					location.id,
					undefined,
					organization.id,
					user.id
				);

				expect(resultId).toBe(location.id);
			});
		});

		it('throws VALIDATION when both location_id and location data are provided', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const locationData = createMockLocation() as LocationCreate;

				await expect(
					locationService.createOrVerifyLocation(
						location.id,
						locationData,
						organization.id,
						user.id
					)
				).rejects.toMatchObject({
					code: 'VALIDATION',
					message: 'Provide either location_id OR location data, not both'
				});
			});
		});

		it('throws VALIDATION when neither location_id nor location data is provided', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				await expect(
					locationService.createOrVerifyLocation(
						undefined,
						undefined,
						organization.id,
						user.id
					)
				).rejects.toMatchObject({ code: 'VALIDATION' });
			});
		});

		it('throws FORBIDDEN when verifying location from different organization', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const otherOrg = await createOrganization();
				const location = await createLocation({
					organization_id: organization.id
				});

				await expect(
					locationService.createOrVerifyLocation(
						location.id,
						undefined,
						otherOrg.id,
						user.id
					)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });
			});
		});
	});

	describe('getLocationByHash()', () => {
		it('returns location when hash matches', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id,
					address_hash: 'test-hash-123'
				});

				const result = await locationService.getLocationByHash(
					'test-hash-123',
					organization.id
				);

				expect(result).not.toBeNull();
				expect(result!.id).toBe(location.id);
			});
		});

		it('returns null when hash does not match', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const result = await locationService.getLocationByHash(
					'non-existent-hash',
					organization.id
				);

				expect(result).toBeNull();
			});
		});

		it('does not return locations from other organizations', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const otherOrg = await createOrganization();
				await createLocation({
					organization_id: organization.id,
					address_hash: 'test-hash-456'
				});

				const result = await locationService.getLocationByHash(
					'test-hash-456',
					otherOrg.id
				);

				expect(result).toBeNull();
			});
		});
	});

	describe('deleteLocation()', () => {
		it('deletes location and returns success', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});

				const result = await locationService.deleteLocation(
					location.id,
					organization.id
				);

				expect(result).toEqual({ success: true });

				await expect(
					locationService.getLocationById(location.id, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws NOT_FOUND when location does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					locationService.deleteLocation(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws FORBIDDEN when attempting to delete location from different organization', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const otherOrg = await createOrganization();
				const location = await createLocation({
					organization_id: organization.id
				});

				await expect(
					locationService.deleteLocation(location.id, otherOrg.id)
				).rejects.toMatchObject({ code: 'FORBIDDEN' });

				// Verify the location was NOT deleted
				const stillExists = await locationService.getLocationById(
					location.id,
					organization.id
				);
				expect(stillExists.id).toBe(location.id);
			});
		});
	});
});
