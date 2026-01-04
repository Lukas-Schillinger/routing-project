import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { invitationService } from '$lib/services/server/invitation.service';
import { error, redirect } from '@sveltejs/kit';
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
		const invitation = await invitationService.getInvitationFromToken(token, email);

		if (!invitation) {
			error(400, { code: 'BAD_REQUEST', message: 'Invalid or expired invitation link' });
		}

		// The intended user of the invitation is already logged in
		if (loggedInUser && loggedInUser.email === invitation.email) {
			redirect(302, '/maps');
		}

		// Redeem invitation and create new user account
		const user = await invitationService.redeemInvitation(invitation);

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
		if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
			throw err;
		}

		console.error('Error redeeming invitation:', err);
		error(500, { code: 'INTERNAL_ERROR', message: 'Failed to redeem invitation' });
	}
};
