import type { LocationCreate } from '$lib/schemas/location';
import { db } from '$lib/server/db';
import { locations, organizations, users } from '$lib/server/db/schema';
import {
	createLocation,
	createMockLocation,
	createOrganization,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServiceError } from './errors';
import { locationService } from './location.service';

/**
 * Location Service Tests
 *
 * These tests use the real database. Test data is cleaned up after each suite.
 * Uses factories from $lib/testing for consistent test data generation.
 */

// Valid UUID format that won't exist in the database
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

// Test fixtures
let testOrg1: { id: string };
let testOrg2: { id: string };
let testUser1: { id: string; organization_id: string };
let testLocation1: {
	id: string;
	organization_id: string;
	address_hash: string | null;
};
let testLocation2: { id: string; organization_id: string };

// Track all created IDs for cleanup
const createdLocationIds: string[] = [];
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create organizations
	testOrg1 = await createOrganization(tx);
	testOrg2 = await createOrganization(tx);
	createdOrgIds.push(testOrg1.id, testOrg2.id);

	// Create user in org1 for audit fields
	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin'
	});
	createdUserIds.push(testUser1.id);

	// Create locations in org1
	testLocation1 = await createLocation(tx, {
		organization_id: testOrg1.id,
		address_hash: 'test-hash-123'
	});
	testLocation2 = await createLocation(tx, {
		organization_id: testOrg1.id
	});
	createdLocationIds.push(testLocation1.id, testLocation2.id);
});

afterAll(async () => {
	// Clean up in correct FK order
	if (createdLocationIds.length > 0) {
		await db.delete(locations).where(inArray(locations.id, createdLocationIds));
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

describe('LocationService', () => {
	describe('getLocations()', () => {
		it('returns all locations for an organization', async () => {
			const result = await locationService.getLocations(testOrg1.id);

			expect(result.length).toBeGreaterThanOrEqual(2);
			const locationIds = result.map((l) => l.id);
			expect(locationIds).toContain(testLocation1.id);
			expect(locationIds).toContain(testLocation2.id);
		});

		it('returns empty array when no locations exist', async () => {
			const result = await locationService.getLocations(testOrg2.id);

			expect(result).toHaveLength(0);
		});

		it('does not return locations from other organizations', async () => {
			const result = await locationService.getLocations(testOrg2.id);

			const locationIds = result.map((l) => l.id);
			expect(locationIds).not.toContain(testLocation1.id);
			expect(locationIds).not.toContain(testLocation2.id);
		});
	});

	describe('getLocationById()', () => {
		it('returns location when found', async () => {
			const result = await locationService.getLocationById(
				testLocation1.id,
				testOrg1.id
			);

			expect(result.id).toBe(testLocation1.id);
			expect(result.organization_id).toBe(testOrg1.id);
		});

		it('throws NOT_FOUND when location does not exist', async () => {
			await expect(
				locationService.getLocationById(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.getLocationById(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN when location belongs to different organization', async () => {
			await expect(
				locationService.getLocationById(testLocation1.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.getLocationById(testLocation1.id, testOrg2.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	describe('createLocation()', () => {
		it('creates location with all provided fields', async () => {
			const locationData = createMockLocation() as LocationCreate;

			const result = await locationService.createLocation(
				locationData,
				testOrg1.id,
				testUser1.id
			);
			createdLocationIds.push(result.id);

			expect(result.id).toBeDefined();
			expect(result.organization_id).toBe(testOrg1.id);
			expect(result.address_line_1).toBe(locationData.address_line_1);
			expect(result.lat).toBe(locationData.lat);
			expect(result.lon).toBe(locationData.lon);
		});

		it('sets created_by and updated_by correctly', async () => {
			const locationData = createMockLocation() as LocationCreate;

			const result = await locationService.createLocation(
				locationData,
				testOrg1.id,
				testUser1.id
			);
			createdLocationIds.push(result.id);

			expect(result.created_by).toBe(testUser1.id);
			expect(result.updated_by).toBe(testUser1.id);
		});

		it('sets created_at and updated_at timestamps', async () => {
			const beforeCreate = new Date();
			const locationData = createMockLocation() as LocationCreate;

			const result = await locationService.createLocation(
				locationData,
				testOrg1.id,
				testUser1.id
			);
			createdLocationIds.push(result.id);

			expect(result.created_at.getTime()).toBeGreaterThanOrEqual(
				beforeCreate.getTime()
			);
			expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(
				beforeCreate.getTime()
			);
		});
	});

	describe('verifyLocationOwnership()', () => {
		it('returns location when ownership is valid', async () => {
			const result = await locationService.verifyLocationOwnership(
				testLocation1.id,
				testOrg1.id
			);

			expect(result.id).toBe(testLocation1.id);
			expect(result.organization_id).toBe(testOrg1.id);
		});

		it('throws NOT_FOUND when location does not exist', async () => {
			await expect(
				locationService.verifyLocationOwnership(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.verifyLocationOwnership(
					NON_EXISTENT_UUID,
					testOrg1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN when location belongs to different organization', async () => {
			await expect(
				locationService.verifyLocationOwnership(testLocation1.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.verifyLocationOwnership(
					testLocation1.id,
					testOrg2.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	describe('createOrVerifyLocation()', () => {
		it('creates new location when location data is provided', async () => {
			const locationData = createMockLocation() as LocationCreate;

			const resultId = await locationService.createOrVerifyLocation(
				undefined,
				locationData,
				testOrg1.id,
				testUser1.id
			);
			createdLocationIds.push(resultId);

			expect(resultId).toBeDefined();

			// Verify the location was created
			const location = await locationService.getLocationById(
				resultId,
				testOrg1.id
			);
			expect(location.address_line_1).toBe(locationData.address_line_1);
		});

		it('verifies existing location when location_id is provided', async () => {
			const resultId = await locationService.createOrVerifyLocation(
				testLocation1.id,
				undefined,
				testOrg1.id,
				testUser1.id
			);

			expect(resultId).toBe(testLocation1.id);
		});

		it('throws VALIDATION when both location_id and location data are provided', async () => {
			const locationData = createMockLocation() as LocationCreate;

			await expect(
				locationService.createOrVerifyLocation(
					testLocation1.id,
					locationData,
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.createOrVerifyLocation(
					testLocation1.id,
					locationData,
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('VALIDATION');
				expect((e as ServiceError).message).toBe(
					'Provide either location_id OR location data, not both'
				);
			}
		});

		it('throws VALIDATION when neither location_id nor location data is provided', async () => {
			await expect(
				locationService.createOrVerifyLocation(
					undefined,
					undefined,
					testOrg1.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.createOrVerifyLocation(
					undefined,
					undefined,
					testOrg1.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('VALIDATION');
			}
		});

		it('throws FORBIDDEN when verifying location from different organization', async () => {
			await expect(
				locationService.createOrVerifyLocation(
					testLocation1.id,
					undefined,
					testOrg2.id,
					testUser1.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.createOrVerifyLocation(
					testLocation1.id,
					undefined,
					testOrg2.id,
					testUser1.id
				);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}
		});
	});

	describe('getLocationByHash()', () => {
		it('returns location when hash matches', async () => {
			const result = await locationService.getLocationByHash(
				'test-hash-123',
				testOrg1.id
			);

			expect(result).not.toBeNull();
			expect(result!.id).toBe(testLocation1.id);
		});

		it('returns null when hash does not match', async () => {
			const result = await locationService.getLocationByHash(
				'non-existent-hash',
				testOrg1.id
			);

			expect(result).toBeNull();
		});

		it('does not return locations from other organizations', async () => {
			const result = await locationService.getLocationByHash(
				'test-hash-123',
				testOrg2.id
			);

			expect(result).toBeNull();
		});
	});

	describe('deleteLocation()', () => {
		it('deletes location and returns success', async () => {
			const tx = db as unknown as TestTransaction;
			const locationToDelete = await createLocation(tx, {
				organization_id: testOrg1.id
			});

			const result = await locationService.deleteLocation(
				locationToDelete.id,
				testOrg1.id
			);

			expect(result).toEqual({ success: true });

			// Verify the location was deleted
			await expect(
				locationService.getLocationById(locationToDelete.id, testOrg1.id)
			).rejects.toThrow(ServiceError);
		});

		it('throws NOT_FOUND when location does not exist', async () => {
			await expect(
				locationService.deleteLocation(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.deleteLocation(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws FORBIDDEN when attempting to delete location from different organization', async () => {
			await expect(
				locationService.deleteLocation(testLocation1.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await locationService.deleteLocation(testLocation1.id, testOrg2.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('FORBIDDEN');
			}

			// Verify the location was NOT deleted
			const location = await locationService.getLocationById(
				testLocation1.id,
				testOrg1.id
			);
			expect(location.id).toBe(testLocation1.id);
		});
	});
});
