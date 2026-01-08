import { handleApiError, ServiceError } from '$lib/errors';
import { createLoginTokenSchema } from '$lib/schemas';
import { mailService } from '$lib/services/external/mail';
import { loginTokenService } from '$lib/services/server/login-token.service';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const body = await request.json();
		const loginTokenData = createLoginTokenSchema.parse(body);

		try {
			// Create login token db entry (service checks if user exists)
			const { loginToken, token } =
				await loginTokenService.createLoginToken(loginTokenData);

			// Send OTP code and login link via email
			await mailService.sendLoginEmail(
				loginToken,
				loginTokenData.email,
				token,
				url.origin
			);
		} catch (err) {
			// If user not found, return 204 to prevent email enumeration
			if (err instanceof ServiceError && err.statusCode === 404) {
				return new Response(null, { status: 204 });
			}
			throw err;
		}

		return new Response(null, { status: 204 });
	} catch (err) {
		handleApiError(err, 'Failed to create login token');
	}
};
