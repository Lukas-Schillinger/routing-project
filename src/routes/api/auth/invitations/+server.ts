import { handleApiError } from '$lib/errors';
import { createInvitationSchema } from '$lib/schemas';
import { mailService } from '$lib/services/external/mail';
import { invitationService } from '$lib/services/server/invitation.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { organizationService } from '$lib/services/server/user.service';
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

		// Does this call belong here or in the mail service? We're only using the organization to personalize the copy
		const organization = await organizationService.getOrganization(
			user.organization_id
		);

		await mailService.sendInvitationEmail(
			invitation,
			token,
			user,
			organization,
			url.origin
		);

		return json(invitation);
	} catch (err) {
		handleApiError(err, 'Failed to create invitation');
	}
};
