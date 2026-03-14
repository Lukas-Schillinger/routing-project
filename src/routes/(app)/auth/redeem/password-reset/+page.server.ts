import { ARGON2_OPTIONS } from '$lib/config/constants';
import { ServiceError } from '$lib/errors';
import { resetPasswordSchema } from '$lib/schemas';
import {
	createSession,
	generateSessionToken,
	invalidateAllUserSessions,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { userService } from '$lib/services/server/user.service';
import { hash } from '@node-rs/argon2';
import { error, fail, redirect } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
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

	const loginToken = await loginTokenService.getLoginTokenFromToken(
		token,
		email
	);

	if (!loginToken) {
		error(400, {
			code: 'INVALID_TOKEN',
			message: 'Invalid or expired reset link'
		});
	}

	if (Date.now() >= loginToken.expires_at.getTime()) {
		error(400, {
			code: 'EXPIRED_TOKEN',
			message: 'This reset link has expired'
		});
	}

	return {
		form: await superValidate(
			{ email, token, newPassword: '' },
			zod4(resetPasswordSchema),
			{ errors: false }
		)
	};
};

export const actions: Actions = {
	reset: async (event) => {
		const form = await superValidate(event.request, zod4(resetPasswordSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { email, token, newPassword } = form.data;

		try {
			const user = await loginTokenService.validateLoginToken(
				token,
				email,
				'password_reset'
			);

			const passwordHash = await hash(newPassword, ARGON2_OPTIONS);

			await userService.updatePasswordHash(
				user.id,
				user.organization_id,
				passwordHash
			);

			await invalidateAllUserSessions(user.id);

			const sessionToken = generateSessionToken();
			const session = await createSession(sessionToken, user.id);
			setSessionTokenCookie(event, sessionToken, session.expires_at);
		} catch (err) {
			if (err instanceof ServiceError) {
				return message(form, err.message, {
					status: err.statusCode as 400 | 500
				});
			}

			event.locals.log.error(err, 'Error resetting password');
			return message(form, 'Failed to reset password', { status: 500 });
		}

		redirect(302, '/auth/account');
	}
};
