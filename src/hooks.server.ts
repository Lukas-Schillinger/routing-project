import * as auth from '$lib/services/server/auth';
import { rolePermissions } from '$lib/services/server/permissions';
import type { Handle } from '@sveltejs/kit';

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

export const handle: Handle = handleAuth;
