// POST /api/magic/request - Create magic login or invite links

import { createMagicInviteSchema, createMagicLoginSchema } from '$lib/schemas';
import { mailService } from '$lib/services/external/mail';
import { authorizeRoute } from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { magicLinkService } from '$lib/services/server/magic-link.service';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const body = await request.json();
		const type = body.type;

		if (type === 'invite') {
			// Invites require authentication
			const user = authorizeRoute();

			const magicInviteData = createMagicInviteSchema.parse(body);

			/** This may need to be updated later. Right now, users can only send
			 * invitations to their own organization. Admins may need the ability  to
			 * invite users to create new organizations in the future.
			 *
			 * When invitee_organization_id is blank a new organization is created for
			 * that user.
			 */
			magicInviteData.invitee_organization_id = user.organization_id;

			// Create magic invite db entry
			const { magicInvite, token } = await magicLinkService.createMagicInvite(
				magicInviteData,
				user.organization_id
			);

			// Send email
			const inviteUrl = `${url.origin}/auth/magic/redeem?token=${token}`;
			await mailService.sendMagicInviteEmail(magicInvite.email, inviteUrl);

			return json(magicInvite);
		} else if (type === 'login') {
			// Login links don't require authentication

			const magicLoginData = createMagicLoginSchema.parse(body);

			try {
				// Create magic login db entry
				const { magicLogin, token } = await magicLinkService.createMagicLogin(magicLoginData);

				// Send OTP code and magic link via email
				await mailService.sendMagicLoginEmail(magicLogin.email, token, url.origin);
			} catch (err) {
				// If user not found, return 204 to prevent email enumeration
				if (err instanceof ServiceError && err.statusCode === 404) {
					return new Response(null, { status: 204 });
				}
				throw err;
			}

			return new Response(null, { status: 204 });
		}

		error(400, 'Invalid magic link type');
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error creating magic link:', err);
		error(500, 'Failed to create magic link');
	}
};
