// POST /api/maps/[mapId]/optimize - Optimize routes for a map

import { optimizationService } from '$lib/services/server';
import { ServiceError } from '$lib/services/server/errors';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		// Parse optimization options from request body
		const body = await request.json();

		// Validate required depotId
		if (!body.depotId) {
			error(400, 'depotId is required for route optimization');
		}

		const result = await optimizationService.optimizeMap(mapId, user.organization_id, {
			depotId: body.depotId,
			mode: body.mode || 'drive',
			traffic: body.traffic,
			optimize: body.optimize || 'time',
			defaultServiceTime: body.defaultServiceTime || 300 // 5 minutes
		});

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
