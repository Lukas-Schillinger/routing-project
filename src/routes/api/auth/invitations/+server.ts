import { createInvitationSchema } from '$lib/schemas';
import { mailService } from '$lib/services/external/mail';
import { ServiceError } from '$lib/services/server/errors';
import { invitationService } from '$lib/services/server/invitation.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const user = requirePermissionApi('users:create');

		const body = await request.json();
		const invitationData = createInvitationSchema.parse(body);

		// Create invitation db entry
		const { invitation, token } = await invitationService.createInvitation(
			invitationData,
			user.organization_id,
			user.id
		);

		await mailService.sendInvitationEmail(invitation, token, url.origin);

		return json(invitation);
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error creating invitation:', err);
		error(500, 'Failed to create invitation');
	}
};
