import { ARGON2_OPTIONS, TOKEN_EXPIRY } from '$lib/config';
import { emailSchema } from '$lib/schemas/common';
import { loginSchema, verifyOTPSchema } from '$lib/schemas/auth';
import * as auth from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { mailService } from '$lib/services/server/mail.service.js';
import { userService } from '$lib/services/server/user.service';
import { verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
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

		const existingUser = await userService.findAnyUserByEmail(validEmail);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect email or password' });
		}

		if (!existingUser.passwordHash) {
			return fail(400, { message: 'Use email link to sign in' });
		}

		const isPasswordValid = await verify(
			existingUser.passwordHash,
			validatedPassword,
			ARGON2_OPTIONS
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
		const rawEmail = formData.get('email');

		const parsed = emailSchema.safeParse(rawEmail);
		if (!parsed.success) {
			return fail(400, { message: 'Email is required' });
		}

		const email = parsed.data;

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
		} catch {
			// Swallow all errors to prevent email enumeration
		}

		// Always return success to prevent email enumeration
		return { resendSuccess: true };
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

			await userService.confirmEmail(user.id);

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
