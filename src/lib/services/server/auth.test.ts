import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import {
	generateSessionToken,
	createSession,
	validateSessionToken,
	invalidateSession,
	setSessionTokenCookie,
	deleteSessionTokenCookie,
	sessionCookieName
} from './auth';
import { createTestEnvironment, withTestTransaction } from '$lib/testing';

/**
 * Session Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function hashToken(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

describe('Session Service', () => {
	describe('generateSessionToken', () => {
		it('produces valid base64url string', () => {
			const token = generateSessionToken();

			expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
			expect(token.length).toBe(24);
		});

		it('generates unique tokens on each call', () => {
			const tokens = new Set<string>();

			for (let i = 0; i < 100; i++) {
				tokens.add(generateSessionToken());
			}

			expect(tokens.size).toBe(100);
		});
	});

	describe('createSession', () => {
		it('inserts session with hashed ID', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();
				const token = generateSessionToken();

				const createdSession = await createSession(token, user.id);

				const expectedId = hashToken(token);
				expect(createdSession.id).toBe(expectedId);
			});
		});

		it('sets expiry to 30 days from now', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();
				const token = generateSessionToken();

				const createdSession = await createSession(token, user.id);

				const expectedExpiry = Date.now() + DAY_IN_MS * 30;
				const diff = Math.abs(
					createdSession.expires_at.getTime() - expectedExpiry
				);
				expect(diff).toBeLessThan(5000);
			});
		});

		it('returns session object with correct user_id', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();
				const token = generateSessionToken();

				const createdSession = await createSession(token, user.id);

				expect(createdSession.user_id).toBe(user.id);
			});
		});
	});

	describe('validateSessionToken', () => {
		it('returns user+session for valid token', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();
				const token = generateSessionToken();
				const createdSession = await createSession(token, user.id);

				const result = await validateSessionToken(token);

				expect(result.session).not.toBeNull();
				expect(result.user).not.toBeNull();
				expect(result.session!.id).toBe(createdSession.id);
				expect(result.user!.id).toBe(user.id);
				expect(result.user!.email).toBe(user.email);
			});
		});

		it('returns null for invalid/unknown token', async () => {
			await withTestTransaction(async () => {
				const result = await validateSessionToken('invalid-token-xyz');

				expect(result.session).toBeNull();
				expect(result.user).toBeNull();
			});
		});

		it('returns null for expired token and deletes session', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();
				const token = generateSessionToken();
				const sessionId = hashToken(token);
				const expiredAt = new Date(Date.now() - DAY_IN_MS);

				await db.insert(session).values({
					id: sessionId,
					user_id: user.id,
					expires_at: expiredAt
				});

				const result = await validateSessionToken(token);

				expect(result.session).toBeNull();
				expect(result.user).toBeNull();

				const [remaining] = await db
					.select()
					.from(session)
					.where(eq(session.id, sessionId));
				expect(remaining).toBeUndefined();
			});
		});

		it('auto-renews session within 15 days of expiry', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();
				const token = generateSessionToken();
				const sessionId = hashToken(token);
				const expiresIn10Days = new Date(Date.now() + DAY_IN_MS * 10);

				await db.insert(session).values({
					id: sessionId,
					user_id: user.id,
					expires_at: expiresIn10Days
				});

				const result = await validateSessionToken(token);

				expect(result.session).not.toBeNull();

				const newExpiry = result.session!.expires_at.getTime();
				const expectedNewExpiry = Date.now() + DAY_IN_MS * 30;
				const diff = Math.abs(newExpiry - expectedNewExpiry);

				expect(diff).toBeLessThan(5000);
			});
		});
	});

	describe('invalidateSession', () => {
		it('removes session from DB', async () => {
			await withTestTransaction(async () => {
				const { user } = await createTestEnvironment();
				const token = generateSessionToken();
				const createdSession = await createSession(token, user.id);

				const [exists] = await db
					.select()
					.from(session)
					.where(eq(session.id, createdSession.id));
				expect(exists).toBeDefined();

				await invalidateSession(createdSession.id);

				const [gone] = await db
					.select()
					.from(session)
					.where(eq(session.id, createdSession.id));
				expect(gone).toBeUndefined();
			});
		});
	});

	describe('setSessionTokenCookie', () => {
		it('sets cookie with correct options', () => {
			const mockEvent = {
				cookies: {
					set: vi.fn(),
					delete: vi.fn()
				}
			} as unknown as RequestEvent;

			const token = 'test-session-token';
			const expiresAt = new Date('2026-02-07T00:00:00Z');

			setSessionTokenCookie(mockEvent, token, expiresAt);

			expect(mockEvent.cookies.set).toHaveBeenCalledWith(
				sessionCookieName,
				token,
				expect.objectContaining({
					expires: expiresAt,
					path: '/',
					httpOnly: true,
					sameSite: 'lax'
				})
			);
		});
	});

	describe('deleteSessionTokenCookie', () => {
		it('deletes cookie with correct options', () => {
			const mockEvent = {
				cookies: {
					set: vi.fn(),
					delete: vi.fn()
				}
			} as unknown as RequestEvent;

			deleteSessionTokenCookie(mockEvent);

			expect(mockEvent.cookies.delete).toHaveBeenCalledWith(
				sessionCookieName,
				expect.objectContaining({
					path: '/',
					httpOnly: true,
					sameSite: 'lax'
				})
			);
		});
	});
});
