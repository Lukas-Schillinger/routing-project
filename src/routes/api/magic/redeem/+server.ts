import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { magicLinkService } from '$lib/services/server/magic-link.service';
import { error, redirect } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import type { RequestHandler } from './$types';

// Schema for magic link redemption
const magicLinkRedeemSchema = z.object({
	token: z.string().min(1, 'Token is required')
});

export const GET: RequestHandler = async (event) => {
	try {
		const token = event.url.searchParams.get('token');

		if (!token) {
			error(400, 'Missing token parameter');
		}

		const validatedData = magicLinkRedeemSchema.parse({ token });

		// Get magic link from token
		const magicLink = await magicLinkService.getMagicLinkFromToken(validatedData.token);

		if (!magicLink) {
			error(400, 'Invalid or expired magic link');
		}

		if (magicLink.type === 'invite') {
			// Create new user account
			const newUser = await magicLinkService.useMagicInvite(validatedData.token);

			// Create session for new user
			const sessionToken = generateSessionToken();
			const session = await createSession(sessionToken, newUser.id);

			// Set session cookie
			setSessionTokenCookie(event, sessionToken, session.expires_at);

			// Redirect to dashboard
			throw redirect(302, '/dashboard');
		} else if (magicLink.type === 'login') {
			// Validate login and get user
			const user = await magicLinkService.validateMagicLogin(validatedData.token);

			// Create session for existing user
			const sessionToken = generateSessionToken();
			const session = await createSession(sessionToken, user.id);

			// Set session cookie
			setSessionTokenCookie(event, sessionToken, session.expires_at);

			// Redirect to dashboard
			throw redirect(302, '/dashboard');
		}

		error(400, 'Invalid magic link type');
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
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
