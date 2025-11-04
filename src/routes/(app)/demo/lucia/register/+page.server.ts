import { registerSchema } from '$lib/schemas/auth';
import * as auth from '$lib/services/server/auth';
import { hash } from '@node-rs/argon2';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/demo/lucia');
	}
	return {};
};

export const actions: Actions = {
	register: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email');
		const password = formData.get('password');
		const passwordConfirm = formData.get('password-confirm');

		// Validate input using Zod
		const validation = registerSchema.safeParse({ email, password, passwordConfirm });
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
