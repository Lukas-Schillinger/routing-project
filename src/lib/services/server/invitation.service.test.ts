import { db } from '$lib/server/db';
import {
	invitations,
	mailRecords,
	organizations,
	users
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServiceError } from './errors';
import { invitationService } from './invitation.service';
import { TokenUtils } from './token.utils';

/**
 * Invitation Service Tests
 *
 * These tests use the real database. Test data is cleaned up after each suite.
 * Each test uses unique identifiers to avoid conflicts.
 */

const testPrefix = `test-invite-${Date.now()}`;

// Test fixtures
let testOrg: { id: string };
let testOrg2: { id: string };
let testUser: { id: string; email: string };

// Track created records for cleanup
const createdInvitationIds: string[] = [];
const createdUserIds: string[] = [];
const createdMailRecordIds: string[] = [];

// Unique email generator
let emailCounter = 0;
function uniqueEmail(): string {
	return `${testPrefix}-${++emailCounter}@example.com`;
}

beforeAll(async () => {
	// Create first test organization
	const [org] = await db
		.insert(organizations)
		.values({ name: `${testPrefix}-org` })
		.returning();
	testOrg = org;

	// Create second organization for tenancy tests
	const [org2] = await db
		.insert(organizations)
		.values({ name: `${testPrefix}-org2` })
		.returning();
	testOrg2 = org2;

	// Create test user for created_by field
	const [user] = await db
		.insert(users)
		.values({
			organization_id: testOrg.id,
			email: `${testPrefix}-admin@example.com`,
			name: 'Test Admin',
			role: 'admin'
		})
		.returning();
	testUser = user;
});

afterAll(async () => {
	// Clean up in dependency order
	for (const id of createdInvitationIds) {
		await db.delete(invitations).where(eq(invitations.id, id));
	}
	for (const id of createdUserIds) {
		await db.delete(users).where(eq(users.id, id));
	}
	for (const id of createdMailRecordIds) {
		await db.delete(mailRecords).where(eq(mailRecords.id, id));
	}
	await db.delete(users).where(eq(users.id, testUser.id));
	await db.delete(organizations).where(eq(organizations.id, testOrg.id));
	await db.delete(organizations).where(eq(organizations.id, testOrg2.id));
});

describe('InvitationService', () => {
	describe('getInvitation', () => {
		it('returns invitation when found with matching org', async () => {
			// Create invitation directly in DB
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: uniqueEmail(),
					token_hash: `test-hash-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			const result = await invitationService.getInvitation(
				invitation.id,
				testOrg.id
			);

			expect(result.id).toBe(invitation.id);
			expect(result.email).toBe(invitation.email);
		});

		it('throws notFound when invitation does not exist', async () => {
			await expect(
				invitationService.getInvitation(
					'00000000-0000-0000-0000-000000000000',
					testOrg.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.getInvitation(
					'00000000-0000-0000-0000-000000000000',
					testOrg.id
				);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(404);
			}
		});

		it('throws notFound when invitation exists in different org (tenancy)', async () => {
			// Create invitation in testOrg
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: uniqueEmail(),
					token_hash: `test-hash-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			// Try to fetch from testOrg2
			await expect(
				invitationService.getInvitation(invitation.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.getInvitation(invitation.id, testOrg2.id);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(404);
			}
		});
	});

	describe('getInvitations', () => {
		it('returns all invitations for organization', async () => {
			const email1 = uniqueEmail();
			const email2 = uniqueEmail();

			// Create two invitations
			const [inv1] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email1,
					token_hash: `test-hash-1-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(inv1.id);

			const [inv2] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email2,
					token_hash: `test-hash-2-${Date.now()}`,
					role: 'admin',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(inv2.id);

			const results = await invitationService.getInvitations(testOrg.id);

			const emails = results.map((i) => i.email);
			expect(emails).toContain(email1);
			expect(emails).toContain(email2);
		});

		it('returns empty array when no invitations exist', async () => {
			// testOrg2 should have no invitations
			const results = await invitationService.getInvitations(testOrg2.id);

			expect(Array.isArray(results)).toBe(true);
			expect(results.length).toBe(0);
		});

		it('only returns invitations for specified organization (tenancy)', async () => {
			const org1Email = uniqueEmail();
			const org2Email = uniqueEmail();

			// Create invitation in testOrg
			const [inv1] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: org1Email,
					token_hash: `test-hash-org1-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(inv1.id);

			// Create invitation in testOrg2
			const [inv2] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg2.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: org2Email,
					token_hash: `test-hash-org2-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(inv2.id);

			// Fetch from testOrg - should only see org1Email
			const org1Results = await invitationService.getInvitations(testOrg.id);
			const org1Emails = org1Results.map((i) => i.email);
			expect(org1Emails).toContain(org1Email);
			expect(org1Emails).not.toContain(org2Email);

			// Fetch from testOrg2 - should only see org2Email
			const org2Results = await invitationService.getInvitations(testOrg2.id);
			const org2Emails = org2Results.map((i) => i.email);
			expect(org2Emails).toContain(org2Email);
			expect(org2Emails).not.toContain(org1Email);
		});
	});

	describe('getInvitationsWithMailRecord', () => {
		it('returns invitations joined with mail records', async () => {
			// Create mail record first
			const [mailRecord] = await db
				.insert(mailRecords)
				.values({
					organization_id: testOrg.id,
					resend_id: `test-resend-${Date.now()}`,
					type: 'invitation',
					to_email: 'test@example.com',
					from_email: 'noreply@example.com',
					status: 'sent'
				})
				.returning();
			createdMailRecordIds.push(mailRecord.id);

			// Create invitation with mail_record_id
			const invEmail = uniqueEmail();
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: invEmail,
					token_hash: `test-hash-mail-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					mail_record_id: mailRecord.id
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			const results = await invitationService.getInvitationsWithMailRecord(
				testOrg.id
			);

			const found = results.find((r) => r.invitation.email === invEmail);
			expect(found).toBeDefined();
			expect(found!.mailRecord.id).toBe(mailRecord.id);
			expect(found!.invitation.id).toBe(invitation.id);
		});

		it('excludes invitations without mail_record_id (inner join)', async () => {
			// Create invitation without mail_record_id
			const invEmail = uniqueEmail();
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: invEmail,
					token_hash: `test-hash-nomail-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					// No mail_record_id
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			const results = await invitationService.getInvitationsWithMailRecord(
				testOrg.id
			);

			const found = results.find((r) => r.invitation.email === invEmail);
			expect(found).toBeUndefined();
		});
	});

	describe('deleteInvitation', () => {
		it('removes invitation from DB and returns success', async () => {
			// Create invitation
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: uniqueEmail(),
					token_hash: `test-hash-delete-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();

			// Delete it
			const result = await invitationService.deleteInvitation(
				invitation.id,
				testOrg.id
			);
			expect(result.success).toBe(true);

			// Verify it's gone
			const [gone] = await db
				.select()
				.from(invitations)
				.where(eq(invitations.id, invitation.id));
			expect(gone).toBeUndefined();
		});

		it('throws notFound when invitation does not exist', async () => {
			await expect(
				invitationService.deleteInvitation(
					'00000000-0000-0000-0000-000000000000',
					testOrg.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.deleteInvitation(
					'00000000-0000-0000-0000-000000000000',
					testOrg.id
				);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(404);
			}
		});

		it('throws notFound when invitation exists in different org (tenancy)', async () => {
			// Create invitation in testOrg
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: uniqueEmail(),
					token_hash: `test-hash-delete2-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			// Try to delete from testOrg2
			await expect(
				invitationService.deleteInvitation(invitation.id, testOrg2.id)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.deleteInvitation(invitation.id, testOrg2.id);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(404);
			}
		});
	});

	describe('getInvitationFromToken', () => {
		it('returns invitation when token hash and email match', async () => {
			const token = '123456';
			const tokenHash = TokenUtils.hash(token);
			const email = uniqueEmail();

			// Create invitation with known token hash
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: tokenHash,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			const result = await invitationService.getInvitationFromToken(
				token,
				email
			);

			expect(result).not.toBeNull();
			expect(result!.id).toBe(invitation.id);
			expect(result!.email).toBe(email);
		});

		it('returns null when token is invalid', async () => {
			const email = uniqueEmail();
			const validToken = '123456';
			const tokenHash = TokenUtils.hash(validToken);

			// Create invitation
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: tokenHash,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			// Try with wrong token
			const result = await invitationService.getInvitationFromToken(
				'000000',
				email
			);

			expect(result).toBeNull();
		});

		it('returns null when email does not match', async () => {
			const email = uniqueEmail();
			const token = '123456';
			const tokenHash = TokenUtils.hash(token);

			// Create invitation
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: tokenHash,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			// Try with wrong email
			const result = await invitationService.getInvitationFromToken(
				token,
				'wrong@example.com'
			);

			expect(result).toBeNull();
		});
	});

	describe('createInvitation', () => {
		it('creates invitation with hashed token and 30-day expiry', async () => {
			const email = uniqueEmail();
			const { invitation, token } = await invitationService.createInvitation(
				{ email, role: 'member' },
				testOrg.id,
				testUser.id
			);
			createdInvitationIds.push(invitation.id);

			// Token hash should be stored, not plain token
			expect(invitation.token_hash).not.toBe(token);
			expect(invitation.token_hash).toBe(TokenUtils.hash(token));

			// Expiry should be ~30 days
			const expectedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
			const diff = Math.abs(
				new Date(invitation.expires_at).getTime() - expectedExpiry.getTime()
			);
			expect(diff).toBeLessThan(5000); // 5 second tolerance
		});

		it('returns 6-digit OTP token', async () => {
			const email = uniqueEmail();
			const { invitation, token } = await invitationService.createInvitation(
				{ email, role: 'member' },
				testOrg.id,
				testUser.id
			);
			createdInvitationIds.push(invitation.id);

			expect(token).toMatch(/^\d{6}$/);
		});

		it('throws conflict when user with email already exists', async () => {
			// testUser already exists in the system
			await expect(
				invitationService.createInvitation(
					{ email: testUser.email, role: 'member' },
					testOrg.id,
					testUser.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.createInvitation(
					{ email: testUser.email, role: 'member' },
					testOrg.id,
					testUser.id
				);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(409);
			}
		});

		it('throws conflict when invitation to email already exists', async () => {
			const email = uniqueEmail();

			// Create first invitation
			const { invitation } = await invitationService.createInvitation(
				{ email, role: 'member' },
				testOrg.id,
				testUser.id
			);
			createdInvitationIds.push(invitation.id);

			// Try to create second invitation to same email
			await expect(
				invitationService.createInvitation(
					{ email, role: 'admin' },
					testOrg.id,
					testUser.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.createInvitation(
					{ email, role: 'admin' },
					testOrg.id,
					testUser.id
				);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(409);
			}
		});

		it('sets correct role from invitationData', async () => {
			const email = uniqueEmail();
			const { invitation } = await invitationService.createInvitation(
				{ email, role: 'admin' },
				testOrg.id,
				testUser.id
			);
			createdInvitationIds.push(invitation.id);

			expect(invitation.role).toBe('admin');
		});
	});

	describe('redeemInvitation', () => {
		it('creates user and marks invitation as used', async () => {
			const email = uniqueEmail();

			// Create invitation
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: `test-hash-redeem-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			// Redeem it
			const user = await invitationService.redeemInvitation(invitation);
			createdUserIds.push(user.id);

			// Verify user was created
			expect(user.email).toBe(email);

			// Verify invitation is marked as used
			const [updated] = await db
				.select()
				.from(invitations)
				.where(eq(invitations.id, invitation.id));
			expect(updated.used_at).not.toBeNull();
		});

		it('returns PublicUser with correct fields', async () => {
			const email = uniqueEmail();

			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: `test-hash-public-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			const user = await invitationService.redeemInvitation(invitation);
			createdUserIds.push(user.id);

			// PublicUser fields
			expect(user).toHaveProperty('id');
			expect(user).toHaveProperty('organization_id');
			expect(user).toHaveProperty('email');
			expect(user).toHaveProperty('name');
			expect(user).toHaveProperty('role');
			expect(user).toHaveProperty('created_at');
			expect(user).toHaveProperty('updated_at');
			expect(user).toHaveProperty('email_confirmed_at');

			// Should NOT have password_hash
			expect(user).not.toHaveProperty('password_hash');
		});

		it('throws forbidden when invitation is expired', async () => {
			const email = uniqueEmail();

			// Create expired invitation
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: `test-hash-expired-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() - 1000) // Already expired
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			await expect(
				invitationService.redeemInvitation(invitation)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.redeemInvitation(invitation);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(403);
			}
		});

		it('throws forbidden when invitation already redeemed', async () => {
			const email = uniqueEmail();

			// Create already-used invitation
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: `test-hash-used-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					used_at: new Date() // Already used
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			await expect(
				invitationService.redeemInvitation(invitation)
			).rejects.toThrow(ServiceError);

			try {
				await invitationService.redeemInvitation(invitation);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(403);
			}
		});

		it('created user has same organization_id as invitation', async () => {
			const email = uniqueEmail();

			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: `test-hash-org-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			const user = await invitationService.redeemInvitation(invitation);
			createdUserIds.push(user.id);

			expect(user.organization_id).toBe(testOrg.id);
		});

		it('created user has same role as invitation', async () => {
			const email = uniqueEmail();

			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: email,
					token_hash: `test-hash-role-${Date.now()}`,
					role: 'admin',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			const user = await invitationService.redeemInvitation(invitation);
			createdUserIds.push(user.id);

			expect(user.role).toBe('admin');
		});
	});

	describe('setMailRecordId', () => {
		it('links mail record to invitation', async () => {
			// Create mail record
			const [mailRecord] = await db
				.insert(mailRecords)
				.values({
					organization_id: testOrg.id,
					resend_id: `test-resend-link-${Date.now()}`,
					type: 'invitation',
					to_email: 'test@example.com',
					from_email: 'noreply@example.com',
					status: 'sent'
				})
				.returning();
			createdMailRecordIds.push(mailRecord.id);

			// Create invitation without mail_record_id
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: uniqueEmail(),
					token_hash: `test-hash-setmail-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			// Link mail record
			await invitationService.setMailRecordId(invitation.id, mailRecord.id);

			// Verify
			const [updated] = await db
				.select()
				.from(invitations)
				.where(eq(invitations.id, invitation.id));
			expect(updated.mail_record_id).toBe(mailRecord.id);
		});

		it('updates existing invitation correctly', async () => {
			// Create two mail records
			const [mailRecord1] = await db
				.insert(mailRecords)
				.values({
					organization_id: testOrg.id,
					resend_id: `test-resend-update1-${Date.now()}`,
					type: 'invitation',
					to_email: 'test@example.com',
					from_email: 'noreply@example.com',
					status: 'sent'
				})
				.returning();
			createdMailRecordIds.push(mailRecord1.id);

			const [mailRecord2] = await db
				.insert(mailRecords)
				.values({
					organization_id: testOrg.id,
					resend_id: `test-resend-update2-${Date.now()}`,
					type: 'invitation',
					to_email: 'test@example.com',
					from_email: 'noreply@example.com',
					status: 'sent'
				})
				.returning();
			createdMailRecordIds.push(mailRecord2.id);

			// Create invitation with first mail record
			const [invitation] = await db
				.insert(invitations)
				.values({
					organization_id: testOrg.id,
					created_by: testUser.id,
					updated_by: testUser.id,
					email: uniqueEmail(),
					token_hash: `test-hash-update-${Date.now()}`,
					role: 'member',
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
					mail_record_id: mailRecord1.id
				})
				.returning();
			createdInvitationIds.push(invitation.id);

			// Update to second mail record
			await invitationService.setMailRecordId(invitation.id, mailRecord2.id);

			// Verify it was updated
			const [updated] = await db
				.select()
				.from(invitations)
				.where(eq(invitations.id, invitation.id));
			expect(updated.mail_record_id).toBe(mailRecord2.id);
		});
	});
});
