import {
	createCreditTransaction,
	createOrganization,
	createTestEnvironment,
	createUser,
	withTestTransaction
} from '$lib/testing';
import { describe, expect, it } from 'vitest';
import { adminService } from './admin.service';

const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

describe('AdminService', () => {
	describe('getAllOrganizations()', () => {
		it('returns organizations with user counts', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization({ name: 'Test Org' });
				await createUser({ organization_id: org.id, role: 'admin' });
				await createUser({ organization_id: org.id, role: 'member' });

				const result = await adminService.getAllOrganizations();
				const found = result.find((o) => o.id === org.id);

				expect(found).toBeDefined();
				expect(found!.name).toBe('Test Org');
				expect(found!.userCount).toBe(2);
			});
		});

		it('returns 0 user count for orgs with no users', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();

				const result = await adminService.getAllOrganizations();
				const found = result.find((o) => o.id === org.id);

				expect(found).toBeDefined();
				expect(found!.userCount).toBe(0);
			});
		});
	});

	describe('getOrganizationDetail()', () => {
		it('returns org with users, credit balance, and transactions', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				await createCreditTransaction({
					organization_id: organization.id,
					amount: 100,
					type: 'purchase'
				});
				await createCreditTransaction({
					organization_id: organization.id,
					amount: -30,
					type: 'usage'
				});

				const result = await adminService.getOrganizationDetail(
					organization.id
				);

				expect(result.organization.id).toBe(organization.id);
				expect(result.users).toHaveLength(1);
				expect(result.creditBalance).toBe(70);
				expect(result.transactions).toHaveLength(2);
			});
		});

		it('throws NOT_FOUND for missing organization', async () => {
			await withTestTransaction(async () => {
				await expect(
					adminService.getOrganizationDetail(NON_EXISTENT_UUID)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('adjustCredits()', () => {
		it('inserts a credit transaction', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();

				await adminService.adjustCredits(
					org.id,
					50,
					'adjustment',
					'Test adjustment'
				);

				const detail = await adminService.getOrganizationDetail(org.id);
				expect(detail.creditBalance).toBe(50);
				expect(detail.transactions).toHaveLength(1);
				expect(detail.transactions[0].type).toBe('adjustment');
				expect(detail.transactions[0].amount).toBe(50);
				expect(detail.transactions[0].description).toBe('Test adjustment');
			});
		});

		it('throws NOT_FOUND for non-existent organization', async () => {
			await withTestTransaction(async () => {
				await expect(
					adminService.adjustCredits(
						NON_EXISTENT_UUID,
						10,
						'adjustment',
						'test'
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('createTestAccount()', () => {
		it('creates organization and admin user', async () => {
			await withTestTransaction(async () => {
				const result = await adminService.createTestAccount({
					email: 'newadmin@example.com',
					name: 'New Admin',
					organizationName: 'New Org'
				});

				expect(result.organization).toBeDefined();
				expect(result.organization.name).toBe('New Org');
				expect(result.user).toBeDefined();
				expect(result.user.email).toBe('newadmin@example.com');
			});
		});

		it('rejects duplicate emails', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				await expect(
					adminService.createTestAccount({ email: user.email })
				).rejects.toMatchObject({ code: 'CONFLICT' });
			});
		});
	});

	describe('createImpersonationSession()', () => {
		it('creates session for target user', async () => {
			await withTestTransaction(async () => {
				const { organization, user: admin } = await createTestEnvironment();
				const target = await createUser({
					organization_id: organization.id,
					role: 'member'
				});

				const result = await adminService.createImpersonationSession(
					target.id,
					admin.id
				);

				expect(result.sessionToken).toBeDefined();
				expect(result.expiresAt).toBeInstanceOf(Date);
			});
		});

		it('rejects self-impersonation', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				await expect(
					adminService.createImpersonationSession(user.id, user.id)
				).rejects.toMatchObject({ code: 'BAD_REQUEST' });
			});
		});

		it('rejects non-existent target user', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				await expect(
					adminService.createImpersonationSession(NON_EXISTENT_UUID, user.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('getDashboardStats()', () => {
		it('returns correct totals', async () => {
			await withTestTransaction(async () => {
				await createOrganization({ subscription_status: 'active' });
				await createOrganization({ subscription_status: null });

				const stats = await adminService.getDashboardStats();

				expect(stats.totalOrganizations).toBeGreaterThanOrEqual(2);
				expect(stats.proOrganizations).toBeGreaterThanOrEqual(1);
				expect(stats.recentTransactions).toBeDefined();
			});
		});
	});

	describe('deleteOrganization()', () => {
		it('deletes organization without stripe subscription', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization({
					stripe_subscription_id: null
				});

				await adminService.deleteOrganization(org.id);

				await expect(
					adminService.getOrganizationDetail(org.id)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws NOT_FOUND for non-existent organization', async () => {
			await withTestTransaction(async () => {
				await expect(
					adminService.deleteOrganization(NON_EXISTENT_UUID)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});
});
