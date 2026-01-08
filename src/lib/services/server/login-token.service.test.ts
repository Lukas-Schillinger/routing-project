import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '$lib/server/db';
import { loginTokens, users, organizations, mailRecords } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LoginTokenService } from './login-token.service';
import { TokenUtils } from './token.utils';
import { ServiceError } from './errors';

/**
 * Login Token Service Tests
 *
 * These tests use the real database. Test data is cleaned up after each suite.
 * Each test uses unique identifiers to avoid conflicts.
 */

const loginTokenService = new LoginTokenService();
const testPrefix = `test-${Date.now()}`;

// Test fixtures
let testOrg: { id: string };
let testUser: { id: string; email: string; organization_id: string };

beforeAll(async () => {
	// Create test organization
	const [org] = await db
		.insert(organizations)
		.values({ name: `${testPrefix}-org` })
		.returning();
	testOrg = org;

	// Create test user
	const [user] = await db
		.insert(users)
		.values({
			organization_id: testOrg.id,
			email: `${testPrefix}@example.com`,
			name: 'Test User',
			role: 'member'
		})
		.returning();
	testUser = user;
});

afterAll(async () => {
	// Clean up test data
	await db.delete(loginTokens).where(eq(loginTokens.user_id, testUser.id));
	await db.delete(users).where(eq(users.id, testUser.id));
	await db.delete(organizations).where(eq(organizations.id, testOrg.id));
});

describe('LoginTokenService', () => {
	describe('createLoginToken', () => {
		it('generates OTP and stores hashed token', async () => {
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			// Token is 6-digit OTP
			expect(token).toMatch(/^\d{6}$/);

			// Hash is stored, not plain token
			expect(loginToken.token_hash).not.toBe(token);
			expect(loginToken.token_hash).toBe(TokenUtils.hash(token));

			// Linked to correct user
			expect(loginToken.user_id).toBe(testUser.id);
			expect(loginToken.organization_id).toBe(testOrg.id);

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});

		it('respects custom expiry duration', async () => {
			const { loginToken } = await loginTokenService.createLoginToken({
				email: testUser.email,
				token_duration_hours: 2
			});

			// Expiry should be ~2 hours from now
			const expectedExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
			const actualExpiry = new Date(loginToken.expires_at);
			const diffMs = Math.abs(actualExpiry.getTime() - expectedExpiry.getTime());

			// Allow 5 second tolerance
			expect(diffMs).toBeLessThan(5000);

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});

		it('supports type: login_token vs password_reset', async () => {
			const { loginToken: loginType } =
				await loginTokenService.createLoginToken({
					email: testUser.email,
					type: 'login_token'
				});

			const { loginToken: resetType } =
				await loginTokenService.createLoginToken({
					email: testUser.email,
					type: 'password_reset'
				});

			expect(loginType.type).toBe('login_token');
			expect(resetType.type).toBe('password_reset');

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginType.id));
			await db.delete(loginTokens).where(eq(loginTokens.id, resetType.id));
		});

		it('throws notFound when user does not exist', async () => {
			await expect(
				loginTokenService.createLoginToken({
					email: 'nonexistent@example.com'
				})
			).rejects.toThrow(ServiceError);

			try {
				await loginTokenService.createLoginToken({
					email: 'nonexistent@example.com'
				});
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(404);
			}
		});
	});

	describe('validateLoginToken', () => {
		it('returns PublicUser for valid token', async () => {
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			const user = await loginTokenService.validateLoginToken(
				token,
				testUser.email
			);

			expect(user.id).toBe(testUser.id);
			expect(user.email).toBe(testUser.email);

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});

		it('throws forbidden for expired token', async () => {
			// Create token with negative duration (already expired)
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email: testUser.email,
				token_duration_hours: -1
			});

			await expect(
				loginTokenService.validateLoginToken(token, testUser.email)
			).rejects.toThrow(ServiceError);

			try {
				await loginTokenService.validateLoginToken(token, testUser.email);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(403);
			}

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});

		it('throws notFound for wrong email', async () => {
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			await expect(
				loginTokenService.validateLoginToken(token, 'wrong@example.com')
			).rejects.toThrow(ServiceError);

			try {
				await loginTokenService.validateLoginToken(token, 'wrong@example.com');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(404);
			}

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});

		it('throws notFound for invalid token', async () => {
			const { loginToken } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			await expect(
				loginTokenService.validateLoginToken('000000', testUser.email)
			).rejects.toThrow(ServiceError);

			try {
				await loginTokenService.validateLoginToken('000000', testUser.email);
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).statusCode).toBe(404);
			}

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});
	});

	describe('getLoginTokenFromToken', () => {
		it('retrieves token by hash + email', async () => {
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			const retrieved = await loginTokenService.getLoginTokenFromToken(
				token,
				testUser.email
			);

			expect(retrieved).not.toBeNull();
			expect(retrieved!.id).toBe(loginToken.id);
			expect(retrieved!.token_hash).toBe(loginToken.token_hash);

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});

		it('returns null when user not found', async () => {
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			const retrieved = await loginTokenService.getLoginTokenFromToken(
				token,
				'nonexistent@example.com'
			);

			expect(retrieved).toBeNull();

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
		});

		it('returns null when token not found', async () => {
			const retrieved = await loginTokenService.getLoginTokenFromToken(
				'000000',
				testUser.email
			);

			expect(retrieved).toBeNull();
		});
	});

	describe('deleteLoginToken', () => {
		it('removes token from DB', async () => {
			const { loginToken } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			// Verify it exists
			const [exists] = await db
				.select()
				.from(loginTokens)
				.where(eq(loginTokens.id, loginToken.id));
			expect(exists).toBeDefined();

			// Delete it
			await loginTokenService.deleteLoginToken(loginToken.id);

			// Verify it's gone
			const [gone] = await db
				.select()
				.from(loginTokens)
				.where(eq(loginTokens.id, loginToken.id));
			expect(gone).toBeUndefined();
		});
	});

	describe('setMailRecordId', () => {
		it('links mail record to token', async () => {
			const { loginToken } = await loginTokenService.createLoginToken({
				email: testUser.email
			});

			// Create a real mail record (FK constraint)
			const [mailRecord] = await db
				.insert(mailRecords)
				.values({
					organization_id: testOrg.id,
					resend_id: `test-resend-${Date.now()}`,
					type: 'login_token',
					to_email: testUser.email,
					from_email: 'test@example.com',
					status: 'sent'
				})
				.returning();

			await loginTokenService.setMailRecordId(loginToken.id, mailRecord.id);

			// Verify it's linked
			const [updated] = await db
				.select()
				.from(loginTokens)
				.where(eq(loginTokens.id, loginToken.id));

			expect(updated.mail_record_id).toBe(mailRecord.id);

			// Cleanup
			await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));
			await db.delete(mailRecords).where(eq(mailRecords.id, mailRecord.id));
		});
	});
});
