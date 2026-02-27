import { describe, it, expect } from 'vitest';
import { db } from '$lib/server/db';
import { loginTokens } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { LoginTokenService } from './login-token.service';
import { TokenUtils } from './token.utils';
import {
	createMailRecord,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';

/**
 * Login Token Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

const loginTokenService = new LoginTokenService();

describe('LoginTokenService', () => {
	describe('createLoginToken', () => {
		it('generates OTP and stores hashed token', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const { loginToken, token } = await loginTokenService.createLoginToken({
					email: user.email
				});

				expect(token).toMatch(/^\d{6}$/);
				expect(loginToken.token_hash).not.toBe(token);
				expect(loginToken.token_hash).toBe(TokenUtils.hash(token));
				expect(loginToken.user_id).toBe(user.id);
				expect(loginToken.organization_id).toBe(organization.id);
			});
		});

		it('respects custom expiry duration', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { loginToken } = await loginTokenService.createLoginToken({
					email: user.email,
					token_duration_hours: 2
				});

				const expectedExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
				const actualExpiry = new Date(loginToken.expires_at);
				const diffMs = Math.abs(
					actualExpiry.getTime() - expectedExpiry.getTime()
				);

				expect(diffMs).toBeLessThan(5000);
			});
		});

		it('supports type: login_token vs password_reset', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { loginToken: loginType } =
					await loginTokenService.createLoginToken({
						email: user.email,
						type: 'login_token'
					});

				const { loginToken: resetType } =
					await loginTokenService.createLoginToken({
						email: user.email,
						type: 'password_reset'
					});

				expect(loginType.type).toBe('login_token');
				expect(resetType.type).toBe('password_reset');
			});
		});

		it('throws notFound when user does not exist', async () => {
			await withTestTransaction(async () => {
				await expect(
					loginTokenService.createLoginToken({
						email: 'nonexistent@example.com'
					})
				).rejects.toMatchObject({ statusCode: 404 });
			});
		});
	});

	describe('validateLoginToken', () => {
		it('returns PublicUser for valid token', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { token } = await loginTokenService.createLoginToken({
					email: user.email
				});

				const validatedUser = await loginTokenService.validateLoginToken(
					token,
					user.email,
					'login_token'
				);

				expect(validatedUser.id).toBe(user.id);
				expect(validatedUser.email).toBe(user.email);
			});
		});

		it('sets used_at after successful validation', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { loginToken, token } = await loginTokenService.createLoginToken({
					email: user.email
				});

				expect(loginToken.used_at).toBeNull();

				await loginTokenService.validateLoginToken(
					token,
					user.email,
					'login_token'
				);

				const [updated] = await db
					.select()
					.from(loginTokens)
					.where(eq(loginTokens.id, loginToken.id));

				expect(updated.used_at).not.toBeNull();
			});
		});

		it('throws forbidden when token has already been used', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { token } = await loginTokenService.createLoginToken({
					email: user.email
				});

				await loginTokenService.validateLoginToken(
					token,
					user.email,
					'login_token'
				);

				await expect(
					loginTokenService.validateLoginToken(token, user.email, 'login_token')
				).rejects.toMatchObject({ statusCode: 403 });
			});
		});

		it('throws forbidden when token type does not match', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { token } = await loginTokenService.createLoginToken({
					email: user.email,
					type: 'password_reset'
				});

				await expect(
					loginTokenService.validateLoginToken(token, user.email, 'login_token')
				).rejects.toMatchObject({ statusCode: 403 });
			});
		});

		it('throws forbidden for expired token', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { token } = await loginTokenService.createLoginToken({
					email: user.email,
					token_duration_hours: -1
				});

				await expect(
					loginTokenService.validateLoginToken(token, user.email, 'login_token')
				).rejects.toMatchObject({ statusCode: 403 });
			});
		});

		it('throws notFound for wrong email', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { token } = await loginTokenService.createLoginToken({
					email: user.email
				});

				await expect(
					loginTokenService.validateLoginToken(
						token,
						'wrong@example.com',
						'login_token'
					)
				).rejects.toMatchObject({ statusCode: 404 });
			});
		});

		it('throws notFound for invalid token', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				await loginTokenService.createLoginToken({
					email: user.email
				});

				await expect(
					loginTokenService.validateLoginToken(
						'000000',
						user.email,
						'login_token'
					)
				).rejects.toMatchObject({ statusCode: 404 });
			});
		});
	});

	describe('getLoginTokenFromToken', () => {
		it('retrieves token by hash + email', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { loginToken, token } = await loginTokenService.createLoginToken({
					email: user.email
				});

				const retrieved = await loginTokenService.getLoginTokenFromToken(
					token,
					user.email
				);

				expect(retrieved).not.toBeNull();
				expect(retrieved!.id).toBe(loginToken.id);
				expect(retrieved!.token_hash).toBe(loginToken.token_hash);
			});
		});

		it('returns null when user not found', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { token } = await loginTokenService.createLoginToken({
					email: user.email
				});

				const retrieved = await loginTokenService.getLoginTokenFromToken(
					token,
					'nonexistent@example.com'
				);

				expect(retrieved).toBeNull();
			});
		});

		it('returns null when token not found', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const retrieved = await loginTokenService.getLoginTokenFromToken(
					'000000',
					user.email
				);

				expect(retrieved).toBeNull();
			});
		});
	});

	describe('deleteLoginToken', () => {
		it('removes token from DB', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();

				const { loginToken } = await loginTokenService.createLoginToken({
					email: user.email
				});

				const [exists] = await db
					.select()
					.from(loginTokens)
					.where(eq(loginTokens.id, loginToken.id));
				expect(exists).toBeDefined();

				await loginTokenService.deleteLoginToken(loginToken.id);

				const [gone] = await db
					.select()
					.from(loginTokens)
					.where(eq(loginTokens.id, loginToken.id));
				expect(gone).toBeUndefined();
			});
		});
	});

	describe('setMailRecordId', () => {
		it('links mail record to token', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();

				const { loginToken } = await loginTokenService.createLoginToken({
					email: user.email
				});

				const mailRecord = await createMailRecord({
					organization_id: organization.id,
					type: 'login_token',
					to_email: user.email
				});

				await loginTokenService.setMailRecordId(loginToken.id, mailRecord.id);

				const [updated] = await db
					.select()
					.from(loginTokens)
					.where(eq(loginTokens.id, loginToken.id));

				expect(updated.mail_record_id).toBe(mailRecord.id);
			});
		});
	});
});
