import { SESSION } from '$lib/config/constants';
import type { PublicUser } from '$lib/schemas';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { publicUserColumns } from './user.service';

const log = logger.child({ service: 'auth' });

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	const token = encodeBase64url(bytes);
	return token;
}

export async function createSession(token: string, userId: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session = {
		id: sessionId,
		user_id: userId,
		expires_at: new Date(Date.now() + DAY_IN_MS * SESSION.DURATION_DAYS)
	};
	await db.insert(table.session).values(session);
	log.info({ userId, sessionId }, 'Session created');
	return session;
}

export async function validateSessionToken(token: string): Promise<{
	session: typeof table.session.$inferSelect | null;
	user: PublicUser | null;
}> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [result] = await db
		.select({
			// Adjust user table here to tweak returned data
			user: publicUserColumns,
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.users, eq(table.session.user_id, table.users.id))
		.where(eq(table.session.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}
	const { session, user } = result;

	const sessionExpired = Date.now() >= session.expires_at.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		log.info({ userId: user.id, sessionId }, 'Session expired');
		return { session: null, user: null };
	}

	const renewSession =
		Date.now() >=
		session.expires_at.getTime() - DAY_IN_MS * SESSION.RENEWAL_THRESHOLD_DAYS;
	if (renewSession) {
		session.expires_at = new Date(
			Date.now() + DAY_IN_MS * SESSION.DURATION_DAYS
		);
		await db
			.update(table.session)
			.set({ expires_at: session.expires_at })
			.where(eq(table.session.id, session.id));
		log.debug({ userId: user.id, sessionId }, 'Session renewed');
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<
	ReturnType<typeof validateSessionToken>
>;

export async function invalidateSession(sessionId: string): Promise<void> {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
	log.info({ sessionId }, 'Session invalidated');
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
	await db.delete(table.session).where(eq(table.session.user_id, userId));
	log.info({ userId }, 'All sessions invalidated for user');
}

export function setSessionTokenCookie(
	event: RequestEvent,
	token: string,
	expiresAt: Date
) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/',
		httpOnly: true,
		secure: !import.meta.env.DEV,
		sameSite: 'lax'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/',
		httpOnly: true,
		secure: !import.meta.env.DEV,
		sameSite: 'lax'
	});
}
