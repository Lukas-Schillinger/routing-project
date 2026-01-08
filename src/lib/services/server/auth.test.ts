import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { session, users, organizations } from '$lib/server/db/schema';
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
import {
	createOrganization,
	createUser,
	type TestTransaction
} from '$lib/testing';

/**
 * Session Service Tests
 *
 * Tests for session token generation, creation, validation, and invalidation.
 * Uses factories from $lib/testing for consistent test data generation.
 */

const DAY_IN_MS = 1000 * 60 * 60 * 24;

// Test fixtures - created via factories
let testOrg: { id: string };
let testUser: { id: string; email: string };

// Track created sessions for cleanup
const createdSessionIds: string[] = [];

beforeAll(async () => {
	// Use factories for consistent test data generation
	// Cast db to TestTransaction since they share the same interface for inserts
	const tx = db as unknown as TestTransaction;

	testOrg = await createOrganization(tx);
	testUser = await createUser(tx, {
		organization_id: testOrg.id,
		role: 'member'
	});
});

afterAll(async () => {
	// Clean up all created sessions
	for (const sessionId of createdSessionIds) {
		await db.delete(session).where(eq(session.id, sessionId));
	}

	// Clean up test user and org
	await db.delete(users).where(eq(users.id, testUser.id));
	await db.delete(organizations).where(eq(organizations.id, testOrg.id));
});

// Helper to hash token like the auth module does
function hashToken(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

describe('Session Service', () => {
	describe('generateSessionToken', () => {
		it('produces valid base64url string', () => {
			const token = generateSessionToken();

			// Base64url characters only
			expect(token).toMatch(/^[A-Za-z0-9_-]+$/);

			// 18 bytes → 24 base64 chars
			expect(token.length).toBe(24);
		});

		it('generates unique tokens on each call', () => {
			const tokens = new Set<string>();

			for (let i = 0; i < 100; i++) {
				tokens.add(generateSessionToken());
			}

			// All 100 should be unique
			expect(tokens.size).toBe(100);
		});
	});

	describe('createSession', () => {
		it('inserts session with hashed ID', async () => {
			const token = generateSessionToken();
			const createdSession = await createSession(token, testUser.id);
			createdSessionIds.push(createdSession.id);

			// Session ID should be hash of token
			const expectedId = hashToken(token);
			expect(createdSession.id).toBe(expectedId);
		});

		it('sets expiry to 30 days from now', async () => {
			const token = generateSessionToken();
			const createdSession = await createSession(token, testUser.id);
			createdSessionIds.push(createdSession.id);

			const expectedExpiry = Date.now() + DAY_IN_MS * 30;
			const diff = Math.abs(
				createdSession.expires_at.getTime() - expectedExpiry
			);

			// Allow 5 second tolerance
			expect(diff).toBeLessThan(5000);
		});

		it('returns session object with correct user_id', async () => {
			const token = generateSessionToken();
			const createdSession = await createSession(token, testUser.id);
			createdSessionIds.push(createdSession.id);

			expect(createdSession.user_id).toBe(testUser.id);
		});
	});

	describe('validateSessionToken', () => {
		it('returns user+session for valid token', async () => {
			const token = generateSessionToken();
			const createdSession = await createSession(token, testUser.id);
			createdSessionIds.push(createdSession.id);

			const result = await validateSessionToken(token);

			expect(result.session).not.toBeNull();
			expect(result.user).not.toBeNull();
			expect(result.session!.id).toBe(createdSession.id);
			expect(result.user!.id).toBe(testUser.id);
			expect(result.user!.email).toBe(testUser.email);
		});

		it('returns null for invalid/unknown token', async () => {
			const result = await validateSessionToken('invalid-token-xyz');

			expect(result.session).toBeNull();
			expect(result.user).toBeNull();
		});

		it('returns null for expired token and deletes session', async () => {
			// Insert session with past expiry directly in DB
			// (This is an edge case that can't be created via normal flow)
			const token = generateSessionToken();
			const sessionId = hashToken(token);
			const expiredAt = new Date(Date.now() - DAY_IN_MS); // 1 day ago

			await db.insert(session).values({
				id: sessionId,
				user_id: testUser.id,
				expires_at: expiredAt
			});

			const result = await validateSessionToken(token);

			expect(result.session).toBeNull();
			expect(result.user).toBeNull();

			// Verify session was deleted
			const [remaining] = await db
				.select()
				.from(session)
				.where(eq(session.id, sessionId));
			expect(remaining).toBeUndefined();
		});

		it('auto-renews session within 15 days of expiry', async () => {
			// Insert session expiring in 10 days (within 15-day renewal window)
			// (This is an edge case that can't be created via normal flow)
			const token = generateSessionToken();
			const sessionId = hashToken(token);
			const expiresIn10Days = new Date(Date.now() + DAY_IN_MS * 10);

			await db.insert(session).values({
				id: sessionId,
				user_id: testUser.id,
				expires_at: expiresIn10Days
			});
			createdSessionIds.push(sessionId);

			const result = await validateSessionToken(token);

			expect(result.session).not.toBeNull();

			// Session should now expire in ~30 days, not 10
			const newExpiry = result.session!.expires_at.getTime();
			const expectedNewExpiry = Date.now() + DAY_IN_MS * 30;
			const diff = Math.abs(newExpiry - expectedNewExpiry);

			expect(diff).toBeLessThan(5000); // 5 second tolerance
		});
	});

	describe('invalidateSession', () => {
		it('removes session from DB', async () => {
			const token = generateSessionToken();
			const createdSession = await createSession(token, testUser.id);

			// Verify it exists
			const [exists] = await db
				.select()
				.from(session)
				.where(eq(session.id, createdSession.id));
			expect(exists).toBeDefined();

			// Invalidate it
			await invalidateSession(createdSession.id);

			// Verify it's gone
			const [gone] = await db
				.select()
				.from(session)
				.where(eq(session.id, createdSession.id));
			expect(gone).toBeUndefined();
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
