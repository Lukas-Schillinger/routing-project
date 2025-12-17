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
	const email = event.url.searchParams.get('email');

	if (!token) {
		error(400, 'Missing token parameter');
	}

	try {
		// Get magic link from token (with email if provided for login links)
		const magicLink = await magicLinkService.getMagicLinkFromToken(token, email ?? undefined);

		if (!magicLink) {
			error(400, 'Invalid or expired link');
		}

		let user;

		if (magicLink.type === 'login') {
			// Login requires email parameter
			if (!email) {
				error(400, 'Missing email parameter');
			}
			// Validate login and get user
			user = await magicLinkService.validateMagicLogin(token, email);
		} else if (magicLink.type === 'invite') {
			// Create new user account from invite
			user = await magicLinkService.useMagicInvite(token);
		} else {
			error(400, 'Invalid link type');
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
			error(err.statusCode, err.message);
		}

		// Re-throw redirect errors
		if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
			throw err;
		}

		console.error('Error redeeming link:', err);
		error(500, 'Failed to redeem link');
	}
};
