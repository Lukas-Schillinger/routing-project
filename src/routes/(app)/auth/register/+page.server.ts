import { TOKEN_EXPIRY } from '$lib/config';
import { ServiceError } from '$lib/errors';
import { registerSchema } from '$lib/schemas/auth';
import { mailService } from '$lib/services/external/mail';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { userService } from '$lib/services/server/user.service';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/auth/account');
	}
	return {};
};

export const actions: Actions = {
	register: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');
		const password = formData.get('password');
		const passwordConfirm = formData.get('password-confirm');

		const validation = registerSchema.safeParse({
			email,
			password,
			passwordConfirm
		});
		if (!validation.success) {
			const errors = validation.error.issues;
			const firstError = errors[0];
			return fail(400, {
				message: firstError.message
			});
		}

		const { email: validEmail, password: validPassword } = validation.data;

		const passwordHash = await hash(validPassword, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		try {
			// Create user (email_confirmed_at will be null)
			await userService.createUser({
				email: validEmail,
				passwordHash: passwordHash,
				role: 'admin'
			});

			// Create login token (acts as confirmation token with longer expiration)
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email: validEmail,
				token_duration_hours: TOKEN_EXPIRY.EMAIL_CONFIRMATION_HOURS
			});

			// Send welcome email
			await mailService.sendLoginEmail(
				loginToken,
				validEmail,
				token,
				event.url.origin,
				true
			);

			// Redirect to login page - confirm=true shows OTP entry with confirmation message
			return redirect(
				302,
				`/auth/login?email=${encodeURIComponent(validEmail)}&confirm=true`
			);
		} catch (error) {
			// Re-throw redirect errors
			if (
				error &&
				typeof error === 'object' &&
				'status' in error &&
				error.status === 302
			) {
				throw error;
			}

			// Check if it's a unique constraint violation (duplicate email)
			if (error instanceof ServiceError) {
				return fail(error.statusCode, { message: error.message });
			}
			console.error('Registration error:', error);
			return fail(500, { message: 'an unknown error occurred' });
		}
	}
};
