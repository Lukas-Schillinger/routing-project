// POST /api/magic/request - Create magic login or invite links

import { createMagicInviteSchema, createMagicLoginSchema } from '$lib/schemas';
import { ServiceError } from '$lib/services/server/errors';
import { magicLinkService } from '$lib/services/server/magic-link.service';
import { userService } from '$lib/services/server/user.service';
import { error, json } from '@sveltejs/kit';
import { z, ZodError } from 'zod';
import type { RequestHandler } from './$types';

// Schema for magic link request
const magicLinkRequestSchema = z.object({
	type: z.enum(['invite', 'login']),
	email: z.string().email(),
	token_duration_hours: z.number().default(720)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	// For invites, user must be authenticated to create invites for their org
	// For login, no auth required (passwordless login)

	try {
		const body = await request.json();
		const magicLinkData = magicLinkRequestSchema.parse(body);

		const expires_at = new Date(Date.now() + magicLinkData.token_duration_hours * 60 * 60 * 1000);
		// const { email, type, token_duration_hours } = validatedData;

		if (magicLinkData.type === 'invite') {
			// Invites require authentication
			const user = locals.user;
			if (!user) {
				error(400, 'Unauthorized');
			}

			const magicInviteData = createMagicInviteSchema.parse({
				expires_at: expires_at,
				...magicLinkData
			});

			// Check if user with this email already exists
			const existingUser = await userService.findAnyUserByEmail(magicInviteData.email);
			if (existingUser) {
				throw error(400, 'A user with this email already exists');
				// throw Error('NO!');
			}

			// Create magic invite
			const { magicInvite } = await magicLinkService.createMagicInvite(
				{
					type: 'invite',
					email: magicInviteData.email,
					expires_at,
					invitee_organization_id: user.organization_id
				},
				user.organization_id
			);

			// TODO: Send email with invite link
			// const inviteUrl = `${url.origin}/auth/magic/redeem?token=${token}`;
			// await emailService.sendInviteEmail(email, inviteUrl);

			return json(magicInvite);
		} else if (magicLinkData.type === 'login') {
			// Login links don't require authentication

			// Check if user exists
			const existingUser = await userService.findAnyUserByEmail(magicLinkData.email);
			if (!existingUser) {
				return json({
					message: 'If an account with this email exists, a login link has been sent'
				});
			}

			const magicLoginData = createMagicLoginSchema.parse({
				expires_at: expires_at,
				user_id: existingUser.id,
				...magicLinkData
			});

			await magicLinkService.createMagicLogin(magicLoginData);

			return json({
				message: 'If an account with this email exists, a login link has been sent'
			});
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
