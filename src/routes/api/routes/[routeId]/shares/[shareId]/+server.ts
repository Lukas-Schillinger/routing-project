// DELETE /api/routes/[routeId]/shares/[shareId] - Delete a share

import { handleApiError } from '$lib/errors';
import { routeShareService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const { routeId, shareId } = params;
	if (!routeId || !shareId) {
		return json(
			{ error: 'Route ID and Share ID are required' },
			{ status: 400 }
		);
	}

	try {
		const result = await routeShareService.deleteShare(
			shareId,
			user.organization_id
		);
		return json(result);
	} catch (err) {
		handleApiError(err, 'Failed to delete route share');
	}
};
