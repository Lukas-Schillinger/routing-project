// GET /api/maps/[mapId]/optimize - Get current optimization job status
// POST /api/maps/[mapId]/optimize - Optimize routes for a map using TSP solver

import { handleApiError } from '$lib/errors';
import { optimizationOptionsSchema } from '$lib/schemas/map';
import { optimizationService } from '$lib/services/server/optimization.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');
	const { mapId } = params;

	try {
		const job = await optimizationService.getActiveJobForMap(
			mapId,
			user.organization_id
		);
		return json({ job });
	} catch (err) {
		handleApiError(err, 'Failed to get optimization status');
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:create');
	const { mapId } = params;

	try {
		const body = await request.json();
		const parsed = optimizationOptionsSchema.safeParse(body);

		if (!parsed.success) {
			throw parsed.error;
		}

		const result = await optimizationService.queueOptimization(
			mapId,
			user.organization_id,
			parsed.data
		);
		return json(result);
	} catch (err) {
		handleApiError(err, 'Failed to optimize routes');
	}
};
