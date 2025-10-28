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

		const result = await optimizationService.optimizeMap(mapId, user.organization_id, {
			mode: body.mode || 'drive',
			traffic: body.traffic,
			optimize: body.optimize || 'time',
			depotLocation: body.depotLocation,
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
