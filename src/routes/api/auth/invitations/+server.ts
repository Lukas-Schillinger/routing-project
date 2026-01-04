import { handleApiError } from '$lib/errors';
import { createInvitationSchema } from '$lib/schemas';
import { mailService } from '$lib/services/external/mail';
import { invitationService } from '$lib/services/server/invitation.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
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
		handleApiError(err, 'Failed to create invitation');
	}
};
