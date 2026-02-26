import { ServiceError } from '$lib/errors';
import { requestPasswordResetSchema } from '$lib/schemas';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { mailService } from '$lib/services/server/mail.service.js';
import { fail } from '@sveltejs/kit';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	form: await superValidate(zod4(requestPasswordResetSchema))
});

export const actions: Actions = {
	requestReset: async ({ request, url }) => {
		const form = await superValidate(request, zod4(requestPasswordResetSchema));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { email } = form.data;

		try {
			const { loginToken, token } = await loginTokenService.createLoginToken({
				email,
				type: 'password_reset'
			});

			await mailService.sendPasswordResetEmail(
				loginToken,
				email,
				token,
				url.origin
			);
		} catch (err) {
			// If user not found, still return success to prevent email enumeration
			if (err instanceof ServiceError && err.statusCode === 404) {
				return message(form, {
					text: 'If an account exists with that email, we sent a reset link.',
					status: 'success',
					email
				});
			}

			return message(
				form,
				{ text: 'Failed to send reset link', status: 'error' },
				{ status: 500 }
			);
		}

		return message(form, {
			text: 'If an account exists with that email, we sent a reset link.',
			status: 'success',
			email
		});
	}
};
