// POST /api/routes/[routeId]/shares/[shareId]/revoke - Revoke a share

import { routeShareService, ServiceError } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:update');

	const { routeId, shareId } = params;
	if (!routeId || !shareId) {
		return json({ error: 'Route ID and Share ID are required' }, { status: 400 });
	}

	try {
		await routeShareService.revokeShare(shareId, user.organization_id);
		return json({ success: true });
	} catch (error) {
		console.error('Error revoking route share:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to revoke route share' }, { status: 500 });
	}
};
