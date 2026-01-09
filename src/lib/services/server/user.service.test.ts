import { db } from '$lib/server/db';
import { invitations, organizations, users } from '$lib/server/db/schema';
import {
	createInvitation,
	createOrganization,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServiceError } from './errors';
import { organizationService, userService } from './user.service';

/**
 * User & Organization Service Tests
 *
 * These tests use the real database. Test data is cleaned up after each suite.
 * Uses factories from $lib/testing for consistent test data generation.
 */

// Valid UUID format that won't exist in the database
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

// Test fixtures
let testOrg1: { id: string; name: string };
let testOrg2: { id: string; name: string };
let testUser1: {
	id: string;
	email: string;
	organization_id: string;
	name: string | null;
};
let testUser2: { id: string; email: string; organization_id: string };
let testUser3: { id: string; email: string; organization_id: string };
let testUserOrg2: { id: string; email: string; organization_id: string };

// Track all created IDs for cleanup
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];
const createdInvitationIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create two organizations for tenancy testing
	testOrg1 = await createOrganization(tx);
	testOrg2 = await createOrganization(tx);
	createdOrgIds.push(testOrg1.id, testOrg2.id);

	// Create users in org1
	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin',
		name: 'Test User 1'
	});
	testUser2 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'member'
	});
	testUser3 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'viewer'
	});
	createdUserIds.push(testUser1.id, testUser2.id, testUser3.id);

	// Create user in org2 for tenancy testing
	testUserOrg2 = await createUser(tx, {
		organization_id: testOrg2.id,
		role: 'member'
	});
	createdUserIds.push(testUserOrg2.id);
});

afterAll(async () => {
	// Clean up in correct FK order
	if (createdInvitationIds.length > 0) {
		await db
			.delete(invitations)
			.where(inArray(invitations.id, createdInvitationIds));
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

describe('UserService', () => {
	describe('getUser()', () => {
		it('returns user when found', async () => {
			const result = await userService.getUser(testUser1.id, testOrg1.id);

			expect(result.id).toBe(testUser1.id);
			expect(result.email).toBe(testUser1.email);
		});

		it('throws notFound when user does not exist', async () => {
			await expect(
				userService.getUser(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);

			try {
				await userService.getUser(NON_EXISTENT_UUID, testOrg1.id);
			} catch (e) {
				expect((e as ServiceError).code).toBe('NOT_FOUND');
			}
		});

		it('throws notFound for user in different organization (tenancy)', async () => {
			// Try to access org1's user with org2's ID
			await expect(
				userService.getUser(testUser1.id, testOrg2.id)
			).rejects.toThrow(ServiceError);
		});
	});

	describe('getPublicUser()', () => {
		it('returns public user fields only (no passwordHash)', async () => {
			const result = await userService.getPublicUser(testUser1.id, testOrg1.id);

			expect(result.id).toBe(testUser1.id);
			expect(result.email).toBe(testUser1.email);
			expect('passwordHash' in result).toBe(false);
		});

		it('throws notFound when user does not exist', async () => {
			await expect(
				userService.getPublicUser(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);
		});
	});

	describe('getPublicUsers()', () => {
		it('returns all users in organization', async () => {
			const result = await userService.getPublicUsers(testOrg1.id);

			// org1 has 3 users
			expect(result).toHaveLength(3);
		});

		it('returns empty array when no users', async () => {
			// Create an empty org just for this test
			const tx = db as unknown as TestTransaction;
			const emptyOrg = await createOrganization(tx);
			createdOrgIds.push(emptyOrg.id);

			const result = await userService.getPublicUsers(emptyOrg.id);

			expect(result).toHaveLength(0);
		});

		it('does not include users from other organizations', async () => {
			const result1 = await userService.getPublicUsers(testOrg1.id);
			const result2 = await userService.getPublicUsers(testOrg2.id);

			expect(result1).toHaveLength(3);
			expect(result2).toHaveLength(1);
		});
	});

	describe('getAnyUser()', () => {
		it('returns user when found (cross-org lookup)', async () => {
			const result = await userService.getAnyUser(testUser1.id);

			expect(result).not.toBeNull();
			expect(result?.id).toBe(testUser1.id);
		});

		it('returns null when user does not exist', async () => {
			const result = await userService.getAnyUser(NON_EXISTENT_UUID);

			// Service returns undefined (not null) when no row found
			expect(result).toBeUndefined();
		});
	});

	describe('findAnyUserByEmail()', () => {
		it('returns user when email found', async () => {
			const result = await userService.findAnyUserByEmail(testUser1.email);

			expect(result).not.toBeNull();
			expect(result?.email).toBe(testUser1.email);
		});

		it('returns null when email not found', async () => {
			const result = await userService.findAnyUserByEmail(
				'nonexistent@example.com'
			);

			// Service returns undefined (not null) when no row found
			expect(result).toBeUndefined();
		});
	});

	describe('updateUser()', () => {
		it('updates user name', async () => {
			const result = await userService.updateUser(testUser1.id, testOrg1.id, {
				name: 'Updated Name'
			});

			expect(result.name).toBe('Updated Name');

			// Restore original name
			await userService.updateUser(testUser1.id, testOrg1.id, {
				name: testUser1.name
			});
		});

		it('sets updated_at and updated_by', async () => {
			const beforeUpdate = new Date();

			await userService.updateUser(testUser1.id, testOrg1.id, {
				name: 'Temp Name'
			});

			const updated = await userService.getUser(testUser1.id, testOrg1.id);
			expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
				beforeUpdate.getTime()
			);
			expect(updated.updated_by).toBe(testUser1.id);

			// Restore
			await userService.updateUser(testUser1.id, testOrg1.id, {
				name: testUser1.name
			});
		});

		it('throws notFound for non-existent user', async () => {
			await expect(
				userService.updateUser(NON_EXISTENT_UUID, testOrg1.id, {
					name: 'Test'
				})
			).rejects.toThrow(ServiceError);
		});

		it('returns updated PublicUser', async () => {
			const result = await userService.updateUser(testUser1.id, testOrg1.id, {
				name: 'Another Name'
			});

			expect(result.name).toBe('Another Name');
			expect('passwordHash' in result).toBe(false);

			// Restore
			await userService.updateUser(testUser1.id, testOrg1.id, {
				name: testUser1.name
			});
		});
	});

	describe('updateUserRole()', () => {
		it('updates user role', async () => {
			const result = await userService.updateUserRole(
				testUser2.id,
				testOrg1.id,
				{ role: 'admin' },
				testUser1.id
			);

			expect(result.role).toBe('admin');

			// Restore
			await userService.updateUserRole(
				testUser2.id,
				testOrg1.id,
				{ role: 'member' },
				testUser1.id
			);
		});

		it('sets updated_at and updated_by with correct userId', async () => {
			const beforeUpdate = new Date();

			await userService.updateUserRole(
				testUser2.id,
				testOrg1.id,
				{ role: 'viewer' },
				testUser1.id
			);

			const updated = await userService.getUser(testUser2.id, testOrg1.id);
			expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
				beforeUpdate.getTime()
			);
			expect(updated.updated_by).toBe(testUser1.id);

			// Restore
			await userService.updateUserRole(
				testUser2.id,
				testOrg1.id,
				{ role: 'member' },
				testUser1.id
			);
		});

		it('throws notFound for non-existent user', async () => {
			await expect(
				userService.updateUserRole(
					NON_EXISTENT_UUID,
					testOrg1.id,
					{ role: 'admin' },
					testUser1.id
				)
			).rejects.toThrow(ServiceError);
		});

		it('returns updated PublicUser', async () => {
			const result = await userService.updateUserRole(
				testUser2.id,
				testOrg1.id,
				{ role: 'viewer' },
				testUser1.id
			);

			expect(result.role).toBe('viewer');
			expect('passwordHash' in result).toBe(false);

			// Restore
			await userService.updateUserRole(
				testUser2.id,
				testOrg1.id,
				{ role: 'member' },
				testUser1.id
			);
		});
	});

	describe('updatePasswordHash()', () => {
		it('updates passwordHash field', async () => {
			const newHash = 'new-password-hash-12345';

			await userService.updatePasswordHash(testUser1.id, testOrg1.id, newHash);

			const updated = await userService.getUser(testUser1.id, testOrg1.id);
			expect(updated.passwordHash).toBe(newHash);

			// Clear hash
			await userService.updatePasswordHash(testUser1.id, testOrg1.id, '');
		});

		it('sets updated_at and updated_by', async () => {
			const beforeUpdate = new Date();

			await userService.updatePasswordHash(
				testUser1.id,
				testOrg1.id,
				'temp-hash'
			);

			const updated = await userService.getUser(testUser1.id, testOrg1.id);
			expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
				beforeUpdate.getTime()
			);
			expect(updated.updated_by).toBe(testUser1.id);

			// Clear
			await userService.updatePasswordHash(testUser1.id, testOrg1.id, '');
		});

		it('throws notFound for non-existent user', async () => {
			await expect(
				userService.updatePasswordHash(NON_EXISTENT_UUID, testOrg1.id, 'hash')
			).rejects.toThrow(ServiceError);
		});
	});

	describe('deleteUser()', () => {
		it('removes user from database', async () => {
			// Create a user to delete
			const tx = db as unknown as TestTransaction;
			const userToDelete = await createUser(tx, {
				organization_id: testOrg1.id
			});

			await userService.deleteUser(userToDelete.id, testOrg1.id);

			const result = await userService.getAnyUser(userToDelete.id);
			// Service returns undefined (not null) when no row found
			expect(result).toBeUndefined();
		});

		it('deletes associated invitations for that email', async () => {
			// Create a user with an invitation
			const tx = db as unknown as TestTransaction;
			const userToDelete = await createUser(tx, {
				organization_id: testOrg1.id
			});
			const invitation = await createInvitation(tx, {
				organization_id: testOrg1.id,
				email: userToDelete.email
			});
			createdInvitationIds.push(invitation.id);

			await userService.deleteUser(userToDelete.id, testOrg1.id);

			// Check invitation is gone
			const { invitationService } = await import('./invitation.service');
			const remainingInvitations = await invitationService.getInvitations(
				testOrg1.id
			);
			const found = remainingInvitations.find((i) => i.id === invitation.id);
			expect(found).toBeUndefined();

			// Remove from cleanup list since it's already deleted
			const idx = createdInvitationIds.indexOf(invitation.id);
			if (idx > -1) createdInvitationIds.splice(idx, 1);
		});

		it('throws notFound for non-existent user', async () => {
			await expect(
				userService.deleteUser(NON_EXISTENT_UUID, testOrg1.id)
			).rejects.toThrow(ServiceError);
		});

		it('returns success object', async () => {
			// Create a user to delete
			const tx = db as unknown as TestTransaction;
			const userToDelete = await createUser(tx, {
				organization_id: testOrg1.id
			});

			const result = await userService.deleteUser(userToDelete.id, testOrg1.id);

			expect(result).toEqual({ success: true });
		});
	});

	describe('createUser()', () => {
		it('creates user with provided organization_id', async () => {
			const email = `test-create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

			const result = await userService.createUser({
				email,
				organization_id: testOrg1.id,
				role: 'member'
			});
			createdUserIds.push(result.id);

			expect(result.organization_id).toBe(testOrg1.id);
			expect(result.id).toBeDefined();
		});

		it('generates new organization when organization_id not provided', async () => {
			const email = `test-no-org-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

			const result = await userService.createUser({ email, role: 'member' });
			createdUserIds.push(result.id);
			createdOrgIds.push(result.organization_id);

			expect(result.organization_id).toBeDefined();

			// Verify org exists
			const org = await organizationService.getOrganization(
				result.organization_id
			);
			expect(org.id).toBe(result.organization_id);
		});

		it('returns created User', async () => {
			const email = `test-return-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

			const result = await userService.createUser({
				email,
				organization_id: testOrg1.id,
				name: 'Test Created User',
				role: 'member'
			});
			createdUserIds.push(result.id);

			expect(result.id).toBeDefined();
			expect(result.email).toBe(email);
			expect(result.name).toBe('Test Created User');
		});
	});
});

describe('OrganizationService', () => {
	describe('getOrganization()', () => {
		it('returns organization when found', async () => {
			const result = await organizationService.getOrganization(testOrg1.id);

			expect(result.id).toBe(testOrg1.id);
			expect(result.name).toBe(testOrg1.name);
		});

		it('throws notFound when organization does not exist', async () => {
			await expect(
				organizationService.getOrganization(NON_EXISTENT_UUID)
			).rejects.toThrow(ServiceError);
		});
	});

	describe('updateOrganization()', () => {
		it('updates organization name', async () => {
			const originalName = testOrg1.name;

			const result = await organizationService.updateOrganization(
				testOrg1.id,
				{ name: 'New Org Name' },
				testUser1.id
			);

			expect(result.name).toBe('New Org Name');

			// Restore
			await organizationService.updateOrganization(
				testOrg1.id,
				{ name: originalName },
				testUser1.id
			);
		});

		it('sets updated_at and updated_by', async () => {
			const beforeUpdate = new Date();
			const originalName = testOrg1.name;

			await organizationService.updateOrganization(
				testOrg1.id,
				{ name: 'Temp Name' },
				testUser1.id
			);

			const updated = await organizationService.getOrganization(testOrg1.id);
			expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
				beforeUpdate.getTime()
			);
			expect(updated.updated_by).toBe(testUser1.id);

			// Restore
			await organizationService.updateOrganization(
				testOrg1.id,
				{ name: originalName },
				testUser1.id
			);
		});
	});
});
