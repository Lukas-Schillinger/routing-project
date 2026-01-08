import { dev } from '$app/environment';
import { handleApiError, ServiceError } from '$lib/errors';
import { requestPasswordResetSchema } from '$lib/schemas';
import { mailService } from '$lib/services/external/mail';
import { loginTokenService } from '$lib/services/server/login-token.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const body = await request.json();
		const { email } = requestPasswordResetSchema.parse(body);

		try {
			// Create login token (reusing login token infrastructure)
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email,
				type: 'password_reset'
			});

			// Send password reset email
			await mailService.sendPasswordResetEmail(
				loginToken,
				email,
				token,
				url.origin
			);

			if (dev) {
				// In dev mode, return the token for easier testing
				return new Response(JSON.stringify({ token }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		} catch (err) {
			// If user not found, still return 204 to prevent email enumeration
			if (err instanceof ServiceError && err.statusCode === 404) {
				return new Response(null, { status: 204 });
			}
			throw err;
		}

		return new Response(null, { status: 204 });
	} catch (err) {
		handleApiError(err, 'Failed to request password reset');
	}
};
