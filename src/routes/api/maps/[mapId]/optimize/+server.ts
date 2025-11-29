// POST /api/maps/[mapId]/optimize - Optimize routes for a map using TSP solver

import { optimizationOptionsSchema } from '$lib/schemas/map';
import { optimizationService } from '$lib/services/server';
import { authorizeRoute } from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const user = authorizeRoute();
	const { mapId } = params;

	try {
		const body = await request.json();
		const parsed = optimizationOptionsSchema.safeParse(body);

		if (!parsed.success) {
			error(400, `Invalid optimization options: ${parsed.error.message}`);
		}

		const result = await optimizationService.optimizeMap(mapId, user.organization_id, parsed.data);
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
