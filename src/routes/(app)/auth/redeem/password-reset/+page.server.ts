import { resetPasswordSchema } from '$lib/schemas';
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { userService } from '$lib/services/server/user.service';
import { hash } from '@node-rs/argon2';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const token = event.url.searchParams.get('token');
	const email = event.url.searchParams.get('email');

	if (!token) {
		error(400, { code: 'BAD_REQUEST', message: 'Missing token parameter' });
	}

	if (!email) {
		error(400, { code: 'BAD_REQUEST', message: 'Missing email parameter' });
	}

	// Validate the token exists and is not expired (don't consume it yet)
	try {
		const loginToken = await loginTokenService.getLoginTokenFromToken(token, email);

		if (!loginToken) {
			error(400, { code: 'INVALID_TOKEN', message: 'Invalid or expired reset link' });
		}

		// Check expiration
		if (Date.now() >= loginToken.expires_at.getTime()) {
			error(400, { code: 'EXPIRED_TOKEN', message: 'This reset link has expired' });
		}
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, { code: err.code, message: err.message });
		}
		throw err;
	}

	return { email, token };
};

export const actions: Actions = {
	reset: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email') as string;
		const token = formData.get('token') as string;
		const newPassword = formData.get('newPassword') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		// Validate input
		const validation = resetPasswordSchema.safeParse({
			email,
			token,
			newPassword,
			confirmPassword
		});

		if (!validation.success) {
			const errors = validation.error.issues;
			const firstError = errors[0];
			return fail(400, { message: firstError.message });
		}

		try {
			// Validate token and get user
			const user = await loginTokenService.validateLoginToken(token, email);

			// Get the login token to delete it after
			const loginToken = await loginTokenService.getLoginTokenFromToken(token, email);

			// Hash the new password
			const passwordHash = await hash(newPassword, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			// Update the user's password
			await userService.updatePasswordHash(user.id, user.organization_id, passwordHash);

			// Delete the used token
			if (loginToken) {
				await loginTokenService.deleteLoginToken(loginToken.id);
			}

			// Create session to log the user in
			const sessionToken = generateSessionToken();
			const session = await createSession(sessionToken, user.id);
			setSessionTokenCookie(event, sessionToken, session.expires_at);

			// Redirect to account page
			redirect(302, '/auth/account');
		} catch (err) {
			// Re-throw redirect errors
			if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
				throw err;
			}

			if (err instanceof ServiceError) {
				return fail(err.statusCode, { message: err.message });
			}

			console.error('Error resetting password:', err);
			return fail(500, { message: 'Failed to reset password' });
		}
	}
};
