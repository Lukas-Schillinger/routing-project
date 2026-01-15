// Validate environment variables at startup
import '$lib/server/env';

import * as Sentry from '@sentry/sveltekit';
import { getLimiterForPath } from '$lib/server/rate-limit';
import * as auth from '$lib/services/server/auth';
import { rolePermissions } from '$lib/services/server/permissions';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const handleRequestId: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	event.locals.requestId = requestId;
	Sentry.setTag('requestId', requestId);

	const response = await resolve(event);
	response.headers.set('X-Request-Id', requestId);
	return response;
};

const handleRateLimit: Handle = async ({ event, resolve }) => {
	const limiter = getLimiterForPath(event.url.pathname);

	if (!limiter) {
		return resolve(event);
	}

	const ip = event.getClientAddress();
	const result = await limiter.limit(ip);

	if (!result.success) {
		return new Response('Too Many Requests', {
			status: 429,
			headers: {
				'Retry-After': String(Math.ceil(result.resetMs / 1000)),
				'X-RateLimit-Remaining': '0',
				'X-RateLimit-Reset': String(Math.ceil(result.resetMs / 1000))
			}
		});
	}

	// Add rate limit headers to successful responses
	const response = await resolve(event);
	response.headers.set('X-RateLimit-Remaining', String(result.remaining));
	response.headers.set(
		'X-RateLimit-Reset',
		String(Math.ceil(result.resetMs / 1000))
	);

	return response;
};

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		event.locals.permissions = [];
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		auth.setSessionTokenCookie(event, sessionToken, session.expires_at);
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;
	if (user) {
		event.locals.permissions = rolePermissions[user.role];
	}
	return resolve(event);
};

export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	handleRequestId,
	handleRateLimit,
	handleAuth
);

const serverErrorHandler: HandleServerError = ({ error, event }) => {
	console.error('Server error:', error, event);
};

export const handleError = Sentry.handleErrorWithSentry(serverErrorHandler);
