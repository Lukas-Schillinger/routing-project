import * as auth from '$lib/server/auth';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import { validateAuthInput, validateRegistrationInput } from '$lib/validation';
import { hash, verify } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/lucia');
	}
	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		// Validate input using Zod
		const validation = validateAuthInput({ email, password });
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

		return redirect(302, '/demo/lucia');
	},
	register: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		// Validate input using Zod
		const validation = validateRegistrationInput({ email, password });
		if (!validation.success) {
			const errors = validation.error.issues;
			const firstError = errors[0];
			return fail(400, {
				message: firstError.message
			});
		}

		const { email: validEmail, password: validPassword } = validation.data;

		const passwordHash = await hash(validPassword, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		try {
			const user = await auth.createUser(validEmail, passwordHash);
			const userId = user.id;

			const sessionToken = auth.generateSessionToken();
			const session = await auth.createSession(sessionToken, userId);
			auth.setSessionTokenCookie(event, sessionToken, session.expires_at);
		} catch (error) {
			// Check if it's a unique constraint violation (duplicate email)
			if (error instanceof Error && error.message.includes('unique')) {
				return fail(400, { message: 'Email already exists' });
			}
			return fail(500, { message: 'An error has occurred' });
		}
		return redirect(302, '/demo/lucia');
	}
};
