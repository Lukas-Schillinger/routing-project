// src/routes/(app)/auth/magic/redeem/+page.server.ts
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { magicLinkService } from '$lib/services/server/magic-link.service';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const token = event.url.searchParams.get('token');

	if (!token) {
		error(400, 'Missing token parameter');
	}

	try {
		// Get magic link from token
		const magicLink = await magicLinkService.getMagicLinkFromToken(token);

		if (!magicLink) {
			error(400, 'Invalid or expired magic link');
		}

		let user;

		if (magicLink.type === 'invite') {
			// Create new user account
			user = await magicLinkService.useMagicInvite(token);
		} else if (magicLink.type === 'login') {
			// Validate existing user login
			user = await magicLinkService.validateMagicLogin(token);
		} else {
			error(400, 'Invalid magic link type');
		}

		// Create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, user.id);

		// Set session cookie
		setSessionTokenCookie(event, sessionToken, session.expires_at);

		// Redirect to dashboard
		throw redirect(302, '/dashboard');
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}

		// Re-throw redirect errors
		if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
			throw err;
		}

		console.error('Error redeeming magic link:', err);
		error(500, 'Failed to redeem magic link');
	}
};
