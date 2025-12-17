import { loginSchema, verifyOTPSchema } from '$lib/schemas/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import * as auth from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { magicLinkService } from '$lib/services/server/magic-link.service';
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

		const results = await db.select().from(table.users).where(eq(table.users.email, validEmail));

		const existingUser = results.at(0);
		if (!existingUser) {
			return fail(400, { message: 'Incorrect email or password' });
		}

		if (!existingUser.passwordHash) {
			return fail(400, { message: 'Use email link to sign in' });
		}

		const isPasswordValid = await verify(existingUser.passwordHash, validatedPassword, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		if (!isPasswordValid) {
			return fail(400, { message: 'Incorrect email or password' });
		}

		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, existingUser.id);
		auth.setSessionTokenCookie(event, sessionToken, session.expires_at);

		return redirect(302, '/auth/account');
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
			const user = await magicLinkService.validateMagicLogin(validCode, validEmail);

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
