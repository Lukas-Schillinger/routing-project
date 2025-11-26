// POST /api/maps/[mapId]/optimize - Optimize routes for a map using TSP solver

import { optimizationService } from '$lib/services/server';
import { authorizeRoute } from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const user = authorizeRoute();

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
			config: {
				fairness: body.fairness || 'medium',
				time_limit_sec: body.timeLimitSec || 30,
				start_at_depot: body.startAtDepot !== false,
				end_at_depot: body.endAtDepot !== false
			}
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
