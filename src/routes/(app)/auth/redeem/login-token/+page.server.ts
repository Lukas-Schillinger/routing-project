import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const loggedInUser = event.locals.user;

	const token = event.url.searchParams.get('token');
	const email = event.url.searchParams.get('email');

	if (!token) {
		error(400, { code: 'BAD_REQUEST', message: 'Missing token parameter' });
	}

	if (!email) {
		error(400, { code: 'BAD_REQUEST', message: 'Missing email parameter' });
	}

	try {
		// The user is logging in again to their own account
		if (loggedInUser && loggedInUser.email === email) {
			redirect(302, '/maps');
		}

		// Validate login token and get user
		const user = await loginTokenService.validateLoginToken(token, email);

		// Set email_confirmed_at if this is first login (email confirmation)
		if (!user.email_confirmed_at) {
			await db
				.update(users)
				.set({ email_confirmed_at: new Date() })
				.where(eq(users.id, user.id));
		}

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, user.id);

		// Set session cookie
		setSessionTokenCookie(event, sessionToken, session.expires_at);

		// Redirect to maps page
		redirect(302, '/maps');
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, { code: err.code, message: err.message });
		}

		// Re-throw redirect errors
		if (
			err &&
			typeof err === 'object' &&
			'status' in err &&
			err.status === 302
		) {
			throw err;
		}

		console.error('Error redeeming login token:', err);
		error(500, {
			code: 'INTERNAL_ERROR',
			message: 'Failed to redeem login token'
		});
	}
};
