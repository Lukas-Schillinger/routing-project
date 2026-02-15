import { TOKEN_EXPIRY } from '$lib/config';
import { loginSchema, verifyOTPSchema } from '$lib/schemas/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as auth from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { mailService } from '$lib/services/external/mail';
import { verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/auth/account');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		// Validate input using Zod
		const validation = loginSchema.safeParse({ email, password });
		if (!validation.success) {
			const errors = validation.error.issues;
			const firstError = errors[0];
			return fail(400, {
				message: firstError.message
			});
		}

		const { email: validEmail, password: validatedPassword } = validation.data;

		const results = await db
			.select()
			.from(table.users)
			.where(eq(table.users.email, validEmail));

		const existingUser = results.at(0);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect email or password' });
		}

		if (!existingUser.passwordHash) {
			return fail(400, { message: 'Use email link to sign in' });
		}

		const isPasswordValid = await verify(
			existingUser.passwordHash,
			validatedPassword,
			{
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			}
		);
		if (!isPasswordValid) {
			return fail(400, { message: 'Incorrect email or password' });
		}

		// Check if email is confirmed
		if (!existingUser.email_confirmed_at) {
			return fail(400, {
				message: 'Please confirm your email before logging in',
				code: 'EMAIL_NOT_CONFIRMED',
				email: validEmail
			});
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id);
		auth.setSessionTokenCookie(event, sessionToken, session.expires_at);

		return redirect(302, '/auth/account');
	},

	resendConfirmation: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email') as string;

		if (!email) {
			return fail(400, { message: 'Email is required' });
		}

		try {
			// Use login token service to create a new login token
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email,
				token_duration_hours: TOKEN_EXPIRY.EMAIL_CONFIRMATION_HOURS
			});

			// Send welcome email
			await mailService.sendLoginEmail(
				loginToken,
				email,
				token,
				event.url.origin,
				true
			);

			// Always return success to prevent email enumeration
			return { resendSuccess: true };
		} catch (error) {
			if (error instanceof ServiceError && error.statusCode === 404) {
				// User not found - still return success to prevent enumeration
				return { resendSuccess: true };
			}
			return { resendSuccess: true };
		}
	},

	verifyOTP: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');
		const code = formData.get('code');

		const validation = verifyOTPSchema.safeParse({ email, code });
		if (!validation.success) {
			const errors = validation.error.issues;
			const firstError = errors[0];
			return fail(400, { message: firstError.message });
		}

		const { email: validEmail, code: validCode } = validation.data;

		try {
			const user = await loginTokenService.validateLoginToken(
				validCode,
				validEmail
			);

			// Set email_confirmed_at if this is first login (email confirmation)
			if (!user.email_confirmed_at) {
				await db
					.update(table.users)
					.set({ email_confirmed_at: new Date() })
					.where(eq(table.users.id, user.id));
			}

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, user.id);
			auth.setSessionTokenCookie(event, sessionToken, session.expires_at);

			return redirect(302, '/auth/account');
		} catch (err) {
			if (err instanceof ServiceError) {
				return fail(err.statusCode, { message: err.message });
			}
			throw err;
		}
	}
};
