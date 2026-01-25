import {
	createInvitation,
	createOrganization,
	createTestEnvironment,
	createUser,
	withTestTransaction
} from '$lib/testing';
import { mockStripeClient, mockStripeState } from '$lib/testing/mocks';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Stripe client for unit tests
vi.mock('$lib/services/external/stripe/client', () => ({
	stripeClient: mockStripeClient
}));

import { organizationService, userService } from './user.service';

/**
 * User & Organization Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

beforeEach(() => {
	mockStripeState.clear();
});

describe('UserService', () => {
	describe('getUser()', () => {
		it('returns user when found', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await userService.getUser(user.id, organization.id);

				expect(result.id).toBe(user.id);
				expect(result.email).toBe(user.email);
			});
		});

		it('throws notFound when user does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					userService.getUser(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('getPublicUser()', () => {
		it('returns public user fields only (no passwordHash)', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await userService.getPublicUser(
					user.id,
					organization.id
				);

				expect(result.id).toBe(user.id);
				expect(result.email).toBe(user.email);
				expect('passwordHash' in result).toBe(false);
			});
		});

		it('throws notFound when user does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					userService.getPublicUser(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('getPublicUsers()', () => {
		it('returns all users in organization', async () => {
			await withTestTransaction(async () => {
				// createTestEnvironment creates one user
				const { organization } = await createTestEnvironment();
				await createUser({ organization_id: organization.id, role: 'member' });
				await createUser({ organization_id: organization.id, role: 'viewer' });

				const result = await userService.getPublicUsers(organization.id);

				expect(result).toHaveLength(3);
			});
		});

		it('returns empty array when no users', async () => {
			await withTestTransaction(async () => {
				const emptyOrg = await createOrganization();

				const result = await userService.getPublicUsers(emptyOrg.id);

				expect(result).toHaveLength(0);
			});
		});
	});

	describe('getAnyUser()', () => {
		it('returns user when found (cross-org lookup)', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const result = await userService.getAnyUser(user.id);

				expect(result).not.toBeNull();
				expect(result?.id).toBe(user.id);
			});
		});

		it('returns undefined when user does not exist', async () => {
			await withTestTransaction(async () => {
				const result = await userService.getAnyUser(NON_EXISTENT_UUID);

				expect(result).toBeUndefined();
			});
		});
	});

	describe('findAnyUserByEmail()', () => {
		it('returns user when email found', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const result = await userService.findAnyUserByEmail(user.email);

				expect(result).not.toBeNull();
				expect(result?.email).toBe(user.email);
			});
		});

		it('returns undefined when email not found', async () => {
			await withTestTransaction(async () => {
				const result = await userService.findAnyUserByEmail(
					'nonexistent@example.com'
				);

				expect(result).toBeUndefined();
			});
		});
	});

	describe('updateUser()', () => {
		it('updates user name', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await userService.updateUser(user.id, organization.id, {
					name: 'Updated Name'
				});

				expect(result.name).toBe('Updated Name');
			});
		});

		it('sets updated_at and updated_by', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const beforeUpdate = new Date();

				await userService.updateUser(user.id, organization.id, {
					name: 'Temp Name'
				});

				const updated = await userService.getUser(user.id, organization.id);
				expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
					beforeUpdate.getTime()
				);
				expect(updated.updated_by).toBe(user.id);
			});
		});

		it('throws notFound for non-existent user', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					userService.updateUser(NON_EXISTENT_UUID, organization.id, {
						name: 'Test'
					})
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('returns updated PublicUser without passwordHash', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await userService.updateUser(user.id, organization.id, {
					name: 'Another Name'
				});

				expect(result.name).toBe('Another Name');
				expect('passwordHash' in result).toBe(false);
			});
		});
	});

	describe('updateUserRole()', () => {
		it('updates user role', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const member = await createUser({
					organization_id: organization.id,
					role: 'member'
				});

				const result = await userService.updateUserRole(
					member.id,
					organization.id,
					{ role: 'admin' },
					user.id
				);

				expect(result.role).toBe('admin');
			});
		});

		it('sets updated_at and updated_by with correct userId', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const member = await createUser({
					organization_id: organization.id,
					role: 'member'
				});
				const beforeUpdate = new Date();

				await userService.updateUserRole(
					member.id,
					organization.id,
					{ role: 'viewer' },
					user.id
				);

				const updated = await userService.getUser(member.id, organization.id);
				expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
					beforeUpdate.getTime()
				);
				expect(updated.updated_by).toBe(user.id);
			});
		});

		it('throws notFound for non-existent user', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				await expect(
					userService.updateUserRole(
						NON_EXISTENT_UUID,
						organization.id,
						{ role: 'admin' },
						user.id
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('returns updated PublicUser without passwordHash', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const member = await createUser({
					organization_id: organization.id,
					role: 'member'
				});

				const result = await userService.updateUserRole(
					member.id,
					organization.id,
					{ role: 'viewer' },
					user.id
				);

				expect(result.role).toBe('viewer');
				expect('passwordHash' in result).toBe(false);
			});
		});
	});

	describe('updatePasswordHash()', () => {
		it('updates passwordHash field', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const newHash = 'new-password-hash-12345';

				await userService.updatePasswordHash(user.id, organization.id, newHash);

				const updated = await userService.getUser(user.id, organization.id);
				expect(updated.passwordHash).toBe(newHash);
			});
		});

		it('sets updated_at and updated_by', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const beforeUpdate = new Date();

				await userService.updatePasswordHash(
					user.id,
					organization.id,
					'temp-hash'
				);

				const updated = await userService.getUser(user.id, organization.id);
				expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
					beforeUpdate.getTime()
				);
				expect(updated.updated_by).toBe(user.id);
			});
		});

		it('throws notFound for non-existent user', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					userService.updatePasswordHash(
						NON_EXISTENT_UUID,
						organization.id,
						'hash'
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('deleteUser()', () => {
		it('removes user from database', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const userToDelete = await createUser({
					organization_id: organization.id
				});

				await userService.deleteUser(userToDelete.id, organization.id);

				const result = await userService.getAnyUser(userToDelete.id);
				expect(result).toBeUndefined();
			});
		});

		it('deletes associated invitations for that email', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const userToDelete = await createUser({
					organization_id: organization.id
				});
				const invitation = await createInvitation({
					organization_id: organization.id,
					email: userToDelete.email
				});

				await userService.deleteUser(userToDelete.id, organization.id);

				const { invitationService } = await import('./invitation.service');
				const remainingInvitations = await invitationService.getInvitations(
					organization.id
				);
				const found = remainingInvitations.find((i) => i.id === invitation.id);
				expect(found).toBeUndefined();
			});
		});

		it('throws notFound for non-existent user', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					userService.deleteUser(NON_EXISTENT_UUID, organization.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('returns success object', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const userToDelete = await createUser({
					organization_id: organization.id
				});

				const result = await userService.deleteUser(
					userToDelete.id,
					organization.id
				);

				expect(result).toEqual({ success: true });
			});
		});
	});

	describe('createUser()', () => {
		it('creates user with provided organization_id', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const email = `test-create-${Date.now()}@example.com`;

				const result = await userService.createUser({
					email,
					organization_id: organization.id,
					role: 'member'
				});

				expect(result.organization_id).toBe(organization.id);
				expect(result.id).toBeDefined();
			});
		});

		it('generates new organization when organization_id not provided', async () => {
			await withTestTransaction(async () => {
				const email = `test-no-org-${Date.now()}@example.com`;

				const result = await userService.createUser({ email, role: 'member' });

				expect(result.organization_id).toBeDefined();

				const org = await organizationService.getOrganization(
					result.organization_id
				);
				expect(org.id).toBe(result.organization_id);

				// Verify Stripe was called (mocked)
				expect(mockStripeState.calls.createCustomer).toHaveLength(1);
				expect(mockStripeState.calls.createCustomer[0].organizationId).toBe(
					result.organization_id
				);
				expect(mockStripeState.calls.createSubscription).toHaveLength(1);
				expect(mockStripeState.calls.createSubscription[0].organizationId).toBe(
					result.organization_id
				);
			});
		});

		it('returns created User with all fields', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const email = `test-return-${Date.now()}@example.com`;

				const result = await userService.createUser({
					email,
					organization_id: organization.id,
					name: 'Test Created User',
					role: 'member'
				});

				expect(result.id).toBeDefined();
				expect(result.email).toBe(email);
				expect(result.name).toBe('Test Created User');
			});
		});
	});
});

describe('OrganizationService', () => {
	describe('getOrganization()', () => {
		it('returns organization when found', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const result = await organizationService.getOrganization(
					organization.id
				);

				expect(result.id).toBe(organization.id);
				expect(result.name).toBe(organization.name);
			});
		});

		it('throws notFound when organization does not exist', async () => {
			await withTestTransaction(async () => {
				await expect(
					organizationService.getOrganization(NON_EXISTENT_UUID)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('updateOrganization()', () => {
		it('updates organization name', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const result = await organizationService.updateOrganization(
					organization.id,
					{ name: 'New Org Name' },
					user.id
				);

				expect(result.name).toBe('New Org Name');
			});
		});

		it('sets updated_at and updated_by', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const beforeUpdate = new Date();

				await organizationService.updateOrganization(
					organization.id,
					{ name: 'Temp Name' },
					user.id
				);

				const updated = await organizationService.getOrganization(
					organization.id
				);
				expect(updated.updated_at!.getTime()).toBeGreaterThanOrEqual(
					beforeUpdate.getTime()
				);
				expect(updated.updated_by).toBe(user.id);
			});
		});
	});
});
