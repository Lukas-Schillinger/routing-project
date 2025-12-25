import { createLoginTokenSchema } from '$lib/schemas';
import { mailService } from '$lib/services/external/mail';
import { ServiceError } from '$lib/services/server/errors';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { error } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const body = await request.json();
		const loginTokenData = createLoginTokenSchema.parse(body);

		try {
			// Create login token db entry (service checks if user exists)
			const { loginToken, token } = await loginTokenService.createLoginToken(loginTokenData);

			// Send OTP code and login link via email
			await mailService.sendLoginEmail(loginToken, loginTokenData.email, token, url.origin);
		} catch (err) {
			// If user not found, return 204 to prevent email enumeration
			if (err instanceof ServiceError && err.statusCode === 404) {
				return new Response(null, { status: 204 });
			}
			throw err;
		}

		return new Response(null, { status: 204 });
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error creating login token:', err);
		error(500, 'Failed to create login token');
	}
};
