// Validate environment variables at startup
import '$lib/server/env';

import * as Sentry from '@sentry/sveltekit';
import { getLimiterForPath } from '$lib/server/rate-limit';
import { createRequestLogger, logger } from '$lib/server/logger';
import * as auth from '$lib/services/server/auth';
import { billingService } from '$lib/services/server/billing.service';
import { rolePermissions } from '$lib/services/server/permissions';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const handleRequestId: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	event.locals.requestId = requestId;

	// Create base logger (userId not available yet - auth hasn't run)
	event.locals.log = createRequestLogger({
		requestId,
		path: event.url.pathname,
		method: event.request.method
	});

	Sentry.setTag('requestId', requestId);

	const start = Date.now();
	const response = await resolve(event); // Auth runs during this
	const duration = Date.now() - start;

	const log = event.locals.log;
	if (response.status >= 500) {
		log.error({ status: response.status, duration }, 'Request failed');
	} else if (response.status >= 400) {
		log.warn({ status: response.status, duration }, 'Client error');
	} else {
		log.info({ status: response.status, duration }, 'Request completed');
	}

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

const IMPERSONATION_COOKIE_NAME = 'admin-original-session';

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	// Check if currently impersonating (admin's original session stored in separate cookie)
	const isImpersonating = !!event.cookies.get(IMPERSONATION_COOKIE_NAME);
	event.locals.isImpersonating = isImpersonating;

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		event.locals.permissions = [];
		event.locals.features = null;
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
		const { plan } = await billingService.getSubscription(user.organization_id);
		event.locals.features = plan.features;
	} else {
		event.locals.features = null;
	}
	return resolve(event);
};

// Runs AFTER handleAuth - enriches logger with user context
const handleEnrichLogger: Handle = async ({ event, resolve }) => {
	if (event.locals.user) {
		// Create child logger with user context bound
		event.locals.log = event.locals.log.child({
			userId: event.locals.user.id,
			organizationId: event.locals.user.organization_id
		});
		Sentry.setUser({ id: event.locals.user.id });
	}
	return resolve(event);
};

export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	handleRequestId,
	handleRateLimit,
	handleAuth,
	handleEnrichLogger
);

const serverErrorHandler: HandleServerError = ({ error, event }) => {
	const log = event.locals?.log ?? logger;
	log.error({ err: error }, 'Unhandled server error');
};

export const handleError = Sentry.handleErrorWithSentry(serverErrorHandler);
