import { ARGON2_OPTIONS, TOKEN_EXPIRY } from '$lib/config';
import { ServiceError } from '$lib/errors';
import { loginSchema, verifyOTPSchema } from '$lib/schemas/auth';
import { emailSchema } from '$lib/schemas/common';
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { mailService } from '$lib/services/server/mail.service.js';
import { userService } from '$lib/services/server/user.service';
import { verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/auth/account');
	}
	return {
		loginForm: await superValidate(zod4(loginSchema))
	};
};

export const actions: Actions = {
	login: async (event) => {
		const loginForm = await superValidate(event.request, zod4(loginSchema));
		if (!loginForm.valid) {
			return fail(400, { form: loginForm });
		}

		const { email, password } = loginForm.data;

		const existingUser = await userService.findAnyUserByEmail(email);
		if (!existingUser) {
			return setError(loginForm, 'email', 'Incorrect email or password');
		}

		if (!existingUser.passwordHash) {
			return setError(loginForm, 'email', 'Use email link to sign in');
		}

		const isPasswordValid = await verify(
			existingUser.passwordHash,
			password,
			ARGON2_OPTIONS
		);
		if (!isPasswordValid) {
			return setError(loginForm, 'email', 'Incorrect email or password');
		}

		if (!existingUser.email_confirmed_at) {
			return message(
				loginForm,
				{
					text: 'Please confirm your email before logging in',
					code: 'EMAIL_NOT_CONFIRMED',
					email
				},
				{ status: 400 }
			);
		}

		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, existingUser.id);
		setSessionTokenCookie(event, sessionToken, session.expires_at);

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
		} catch {
			// Swallow all errors to prevent email enumeration
		}

		return { resendSuccess: true };
	},

	requestOTP: async (event) => {
		const formData = await event.request.formData();
		const parsed = emailSchema.safeParse(formData.get('email'));
		if (!parsed.success) {
			return fail(400, { otpError: 'Please enter a valid email address' });
		}

		const email = parsed.data;

		try {
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email
			});

			await mailService.sendLoginEmail(
				loginToken,
				email,
				token,
				event.url.origin
			);
		} catch (err) {
			// If user not found, still return success to prevent email enumeration
			if (err instanceof ServiceError && err.statusCode === 404) {
				return { otpSent: true };
			}
			return fail(500, { otpError: 'Error sending login code' });
		}

		return { otpSent: true };
	},

	verifyOTP: async (event) => {
		const formData = await event.request.formData();
		const validation = verifyOTPSchema.safeParse({
			email: formData.get('email'),
			code: formData.get('code')
		});

		if (!validation.success) {
			return fail(400, { otpError: validation.error.issues[0].message });
		}

		const { email, code } = validation.data;

		try {
			const user = await loginTokenService.validateLoginToken(
				code,
				email,
				'login_token'
			);

			await userService.confirmEmail(user.id);

			const sessionToken = generateSessionToken();
			const session = await createSession(sessionToken, user.id);
			setSessionTokenCookie(event, sessionToken, session.expires_at);
		} catch (err) {
			if (err instanceof ServiceError) {
				return fail(err.statusCode, { otpError: err.message });
			}
			throw err;
		}

		redirect(302, '/auth/account');
	}
};
