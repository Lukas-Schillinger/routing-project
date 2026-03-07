import { handleApiError } from '$lib/errors';
import { mapService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:update');

	const { mapId } = params;

	try {
		// Reset optimization using the map service
		await mapService.resetOptimization(mapId, user.organization_id, user.id);

		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to reset optimization');
	}
};
