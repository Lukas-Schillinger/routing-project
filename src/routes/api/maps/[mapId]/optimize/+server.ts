// GET /api/maps/[mapId]/optimize - Get current optimization job status
// POST /api/maps/[mapId]/optimize - Optimize routes for a map using TSP solver

import { optimizationOptionsSchema } from '$lib/schemas/map';
import { ServiceError } from '$lib/services/server/errors';
import { optimizationService } from '$lib/services/server/optimization.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');
	const { mapId } = params;

	try {
		const job = await optimizationService.getActiveJobForMap(mapId, user.organization_id);
		return json({ job });
	} catch (err) {
		console.error('Error getting optimization status:', err);

		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}

		error(500, 'Failed to get optimization status');
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:create');
	const { mapId } = params;

	try {
		const body = await request.json();
		const parsed = optimizationOptionsSchema.safeParse(body);

		if (!parsed.success) {
			error(400, `Invalid optimization options: ${parsed.error.message}`);
		}

		const result = await optimizationService.queueOptimization(
			mapId,
			user.organization_id,
			parsed.data
		);
		return json(result);
	} catch (err) {
		console.error('Error optimizing routes:', err);

		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}

		if (err instanceof Error) {
			error(500, `Optimization failed: ${err.message}`);
		}

		error(500, 'Failed to optimize routes');
	}
};
