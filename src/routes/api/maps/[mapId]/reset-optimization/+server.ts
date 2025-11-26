import { mapService, ServiceError } from '$lib/services/server';
import { authorizeRoute } from '$lib/services/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params }) => {
	const user = authorizeRoute();

	const { mapId } = params;

	if (!mapId) {
		return json({ error: 'Map ID is required' }, { status: 400 });
	}

	try {
		// Reset optimization using the map service
		await mapService.resetOptimization(mapId, user.organization_id);

		return json({ success: true });
	} catch (error) {
		console.error('Reset optimization error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to reset optimization'
			},
			{ status: 500 }
		);
	}
};
