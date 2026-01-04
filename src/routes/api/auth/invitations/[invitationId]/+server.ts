import { handleApiError } from '$lib/errors';
import { invitationService } from '$lib/services/server/invitation.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const user = requirePermissionApi('users:delete');

		await invitationService.deleteInvitation(params.invitationId, user.organization_id);
		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to delete invitation');
	}
};
