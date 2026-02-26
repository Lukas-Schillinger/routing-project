import { ARGON2_OPTIONS, TOKEN_EXPIRY } from '$lib/config';
import { ServiceError } from '$lib/errors';
import { registerSchema } from '$lib/schemas/auth';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { mailService } from '$lib/services/server/mail.service.js';
import { userService } from '$lib/services/server/user.service';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/auth/account');
	}
	return {
		form: await superValidate(zod4(registerSchema))
	};
};

export const actions: Actions = {
	register: async (event) => {
		const form = await superValidate(event.request, zod4(registerSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { email, password } = form.data;
		const passwordHash = await hash(password, ARGON2_OPTIONS);

		try {
			await userService.createUser({
				email,
				passwordHash,
				role: 'admin'
			});

			const { loginToken, token } = await loginTokenService.createLoginToken({
				email,
				token_duration_hours: TOKEN_EXPIRY.EMAIL_CONFIRMATION_HOURS
			});

			await mailService.sendLoginEmail(
				loginToken,
				email,
				token,
				event.url.origin,
				true
			);
		} catch (err) {
			if (err instanceof ServiceError) {
				return setError(form, 'email', err.message);
			}
			console.error('Registration error:', err);
			return message(form, 'An unexpected error occurred', { status: 500 });
		}

		redirect(
			302,
			`/auth/login?email=${encodeURIComponent(email)}&confirm=true`
		);
	}
};
