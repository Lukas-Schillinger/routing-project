import { ServiceError } from '$lib/services/server/errors';
import { invitationService } from '$lib/services/server/invitation.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const user = requirePermissionApi('users:delete');

		await invitationService.deleteInvitation(params.invitationId, user.organization_id);
		return json({ success: true });
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error deleting invitation:', err);
		error(500, 'Failed to delete invitation');
	}
};
