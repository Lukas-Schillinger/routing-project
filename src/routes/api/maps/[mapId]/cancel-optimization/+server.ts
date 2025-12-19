// POST /api/maps/[mapId]/cancel-optimization - Cancel an active optimization job

import { ServiceError } from '$lib/services/server/errors';
import { optimizationService } from '$lib/services/server/optimization.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:update');
	const { mapId } = params;

	try {
		const result = await optimizationService.cancelOptimization(mapId, user.organization_id);
		return json(result);
	} catch (err) {
		console.error('Error cancelling optimization:', err);

		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}

		error(500, 'Failed to cancel optimization');
	}
};
