import { db } from '$lib/server/db';
import { invitations, mailRecords } from '$lib/server/db/schema';
import { createTestEnvironment, withTestTransaction } from '$lib/testing';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { invitationService } from './invitation.service';
import { TokenUtils } from './token.utils';

/**
 * Invitation Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

describe('InvitationService', () => {
	describe('getInvitation', () => {
		it('returns invitation when found with matching org', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: 'test-invite@example.com',
						token_hash: `test-hash-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				const result = await invitationService.getInvitation(
					invitation.id,
					organization.id
				);

				expect(result.id).toBe(invitation.id);
				expect(result.email).toBe(invitation.email);
			});
		});

		it('throws notFound when invitation does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await expect(
					invitationService.getInvitation(
						'00000000-0000-0000-0000-000000000000',
						organization.id
					)
				).rejects.toMatchObject({ statusCode: 404 });
			});
		});
	});

	describe('getInvitations', () => {
		it('returns all invitations for organization', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email1 = `test-invite-1-${Date.now()}@example.com`;
				const email2 = `test-invite-2-${Date.now()}@example.com`;

				await db.insert(invitations).values({
					organization_id: organization.id,
					created_by: user.id,
					updated_by: user.id,
					email: email1,
					token_hash: `test-hash-1-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				await db.insert(invitations).values({
					organization_id: organization.id,
					created_by: user.id,
					updated_by: user.id,
					email: email2,
					token_hash: `test-hash-2-${Date.now()}`,
					role: 'admin',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				const results = await invitationService.getInvitations(organization.id);

				const emails = results.map((i) => i.email);
				expect(emails).toContain(email1);
				expect(emails).toContain(email2);
			});
		});
	});

	describe('getInvitationsWithMailRecord', () => {
		it('returns invitations joined with mail records', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const [mailRecord] = await db
					.insert(mailRecords)
					.values({
						organization_id: organization.id,
						resend_id: `test-resend-${Date.now()}`,
						type: 'invitation',
						to_email: 'test@example.com',
						from_email: 'noreply@example.com',
						status: 'sent'
					})
					.returning();

				const invEmail = `test-invite-mail-${Date.now()}@example.com`;
				await db.insert(invitations).values({
					organization_id: organization.id,
					created_by: user.id,
					updated_by: user.id,
					email: invEmail,
					token_hash: `test-hash-mail-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					mail_record_id: mailRecord.id
				});

				const results = await invitationService.getInvitationsWithMailRecord(
					organization.id
				);

				const found = results.find((r) => r.invitation.email === invEmail);
				expect(found).toBeDefined();
				expect(found!.mailRecord.id).toBe(mailRecord.id);
			});
		});

		it('excludes invitations without mail_record_id (inner join)', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const invEmail = `test-invite-nomail-${Date.now()}@example.com`;
				await db.insert(invitations).values({
					organization_id: organization.id,
					created_by: user.id,
					updated_by: user.id,
					email: invEmail,
					token_hash: `test-hash-nomail-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				const results = await invitationService.getInvitationsWithMailRecord(
					organization.id
				);

				const found = results.find((r) => r.invitation.email === invEmail);
				expect(found).toBeUndefined();
			});
		});
	});

	describe('deleteInvitation', () => {
		it('removes invitation from DB and returns success', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: `test-delete-${Date.now()}@example.com`,
						token_hash: `test-hash-delete-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				const result = await invitationService.deleteInvitation(
					invitation.id,
					organization.id
				);
				expect(result.success).toBe(true);

				const [gone] = await db
					.select()
					.from(invitations)
					.where(eq(invitations.id, invitation.id));
				expect(gone).toBeUndefined();
			});
		});

		it('silently succeeds when invitation does not exist', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const result = await invitationService.deleteInvitation(
					'00000000-0000-0000-0000-000000000000',
					organization.id
				);
				expect(result.success).toBe(true);
			});
		});
	});

	describe('getInvitationFromToken', () => {
		it('returns invitation when token hash and email match', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const token = '123456';
				const tokenHash = TokenUtils.hash(token);
				const email = `test-token-${Date.now()}@example.com`;

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: email,
						token_hash: tokenHash,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				const result = await invitationService.getInvitationFromToken(
					token,
					email
				);

				expect(result).not.toBeNull();
				expect(result!.id).toBe(invitation.id);
				expect(result!.email).toBe(email);
			});
		});

		it('returns null when token is invalid', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-invalid-token-${Date.now()}@example.com`;
				const validToken = '123456';
				const tokenHash = TokenUtils.hash(validToken);

				await db.insert(invitations).values({
					organization_id: organization.id,
					created_by: user.id,
					updated_by: user.id,
					email: email,
					token_hash: tokenHash,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				const result = await invitationService.getInvitationFromToken(
					'000000',
					email
				);

				expect(result).toBeNull();
			});
		});

		it('returns null when email does not match', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-wrong-email-${Date.now()}@example.com`;
				const token = '123456';
				const tokenHash = TokenUtils.hash(token);

				await db.insert(invitations).values({
					organization_id: organization.id,
					created_by: user.id,
					updated_by: user.id,
					email: email,
					token_hash: tokenHash,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				const result = await invitationService.getInvitationFromToken(
					token,
					'wrong@example.com'
				);

				expect(result).toBeNull();
			});
		});
	});

	describe('createInvitation', () => {
		it('creates invitation with hashed token and 30-day expiry', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-create-${Date.now()}@example.com`;

				const { invitation, token } = await invitationService.createInvitation(
					{ email, role: 'member' },
					organization.id,
					user.id
				);

				expect(invitation.token_hash).not.toBe(token);
				expect(invitation.token_hash).toBe(TokenUtils.hash(token));

				const expectedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
				const diff = Math.abs(
					new Date(invitation.expires_at).getTime() - expectedExpiry.getTime()
				);
				expect(diff).toBeLessThan(5000);
			});
		});

		it('returns 6-digit OTP token', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-otp-${Date.now()}@example.com`;

				const { token } = await invitationService.createInvitation(
					{ email, role: 'member' },
					organization.id,
					user.id
				);

				expect(token).toMatch(/^\d{6}$/);
			});
		});

		it('throws conflict when user with email already exists', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				await expect(
					invitationService.createInvitation(
						{ email: user.email, role: 'member' },
						organization.id,
						user.id
					)
				).rejects.toMatchObject({ statusCode: 409 });
			});
		});

		it('throws conflict when invitation to email already exists', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-dup-${Date.now()}@example.com`;

				await invitationService.createInvitation(
					{ email, role: 'member' },
					organization.id,
					user.id
				);

				await expect(
					invitationService.createInvitation(
						{ email, role: 'admin' },
						organization.id,
						user.id
					)
				).rejects.toMatchObject({ statusCode: 409 });
			});
		});

		it('sets correct role from invitationData', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-role-${Date.now()}@example.com`;

				const { invitation } = await invitationService.createInvitation(
					{ email, role: 'admin' },
					organization.id,
					user.id
				);

				expect(invitation.role).toBe('admin');
			});
		});
	});

	describe('redeemInvitation', () => {
		it('creates user and marks invitation as used', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-redeem-${Date.now()}@example.com`;

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: email,
						token_hash: `test-hash-redeem-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				const newUser = await invitationService.redeemInvitation(invitation);

				expect(newUser.email).toBe(email);

				const [updated] = await db
					.select()
					.from(invitations)
					.where(eq(invitations.id, invitation.id));
				expect(updated.used_at).not.toBeNull();
			});
		});

		it('returns PublicUser with correct fields', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-public-${Date.now()}@example.com`;

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: email,
						token_hash: `test-hash-public-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				const newUser = await invitationService.redeemInvitation(invitation);

				expect(newUser).toHaveProperty('id');
				expect(newUser).toHaveProperty('organization_id');
				expect(newUser).toHaveProperty('email');
				expect(newUser).toHaveProperty('name');
				expect(newUser).toHaveProperty('role');
				expect(newUser).toHaveProperty('created_at');
				expect(newUser).toHaveProperty('updated_at');
				expect(newUser).toHaveProperty('email_confirmed_at');
				expect(newUser).not.toHaveProperty('password_hash');
			});
		});

		it('throws forbidden when invitation is expired', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-expired-${Date.now()}@example.com`;

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: email,
						token_hash: `test-hash-expired-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() - 1000)
					})
					.returning();

				await expect(
					invitationService.redeemInvitation(invitation)
				).rejects.toMatchObject({ statusCode: 403 });
			});
		});

		it('throws forbidden when invitation already redeemed', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-used-${Date.now()}@example.com`;

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: email,
						token_hash: `test-hash-used-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
						used_at: new Date()
					})
					.returning();

				await expect(
					invitationService.redeemInvitation(invitation)
				).rejects.toMatchObject({ statusCode: 403 });
			});
		});

		it('created user has same organization_id as invitation', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-org-${Date.now()}@example.com`;

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: email,
						token_hash: `test-hash-org-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				const newUser = await invitationService.redeemInvitation(invitation);

				expect(newUser.organization_id).toBe(organization.id);
			});
		});

		it('created user has same role as invitation', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const email = `test-role-redeem-${Date.now()}@example.com`;

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: email,
						token_hash: `test-hash-role-${Date.now()}`,
						role: 'admin',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				const newUser = await invitationService.redeemInvitation(invitation);

				expect(newUser.role).toBe('admin');
			});
		});
	});

	describe('setMailRecordId', () => {
		it('links mail record to invitation', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const [mailRecord] = await db
					.insert(mailRecords)
					.values({
						organization_id: organization.id,
						resend_id: `test-resend-link-${Date.now()}`,
						type: 'invitation',
						to_email: 'test@example.com',
						from_email: 'noreply@example.com',
						status: 'sent'
					})
					.returning();

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: `test-setmail-${Date.now()}@example.com`,
						token_hash: `test-hash-setmail-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					})
					.returning();

				await invitationService.setMailRecordId(invitation.id, mailRecord.id);

				const [updated] = await db
					.select()
					.from(invitations)
					.where(eq(invitations.id, invitation.id));
				expect(updated.mail_record_id).toBe(mailRecord.id);
			});
		});

		it('updates existing invitation correctly', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const [mailRecord1] = await db
					.insert(mailRecords)
					.values({
						organization_id: organization.id,
						resend_id: `test-resend-update1-${Date.now()}`,
						type: 'invitation',
						to_email: 'test@example.com',
						from_email: 'noreply@example.com',
						status: 'sent'
					})
					.returning();

				const [mailRecord2] = await db
					.insert(mailRecords)
					.values({
						organization_id: organization.id,
						resend_id: `test-resend-update2-${Date.now()}`,
						type: 'invitation',
						to_email: 'test@example.com',
						from_email: 'noreply@example.com',
						status: 'sent'
					})
					.returning();

				const [invitation] = await db
					.insert(invitations)
					.values({
						organization_id: organization.id,
						created_by: user.id,
						updated_by: user.id,
						email: `test-update-${Date.now()}@example.com`,
						token_hash: `test-hash-update-${Date.now()}`,
						role: 'member',
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
						mail_record_id: mailRecord1.id
					})
					.returning();

				await invitationService.setMailRecordId(invitation.id, mailRecord2.id);

				const [updated] = await db
					.select()
					.from(invitations)
					.where(eq(invitations.id, invitation.id));
				expect(updated.mail_record_id).toBe(mailRecord2.id);
			});
		});
	});
});
