import { distanceMatrixService } from '$lib/services/distance-matrix';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/maps/[mapId]/distance-matrix
 * Create a distance matrix for a map
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		// Parse request body for options
		const body = await request.json().catch(() => ({}));
		const { profile = 'driving', provider = 'mapbox', units = 'metric' } = body;

		// Create distance matrix
		const result = await distanceMatrixService.createDistanceMatrix(mapId, user.organization_id, {
			profile,
			provider,
			units
		});

		return json({
			success: true,
			matrixId: result.matrixId,
			entriesCount: result.entriesCount,
			message: `Distance matrix created with ${result.entriesCount} entries`
		});
	} catch (err) {
		console.error('Error creating distance matrix:', err);

		if (err instanceof Error) {
			throw error(400, err.message);
		}

		throw error(500, 'Failed to create distance matrix');
	}
};

/**
 * GET /api/maps/[mapId]/distance-matrix
 * Get the distance matrix for a map
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		const result = await distanceMatrixService.getDistanceMatrix(mapId);

		if (!result) {
			throw error(404, 'Distance matrix not found for this map');
		}

		return json({
			success: true,
			matrix: result.matrix,
			entries: result.entries
		});
	} catch (err) {
		console.error('Error fetching distance matrix:', err);

		if (err instanceof Error && err.message.includes('not found')) {
			throw error(404, err.message);
		}

		throw error(500, 'Failed to fetch distance matrix');
	}
};
