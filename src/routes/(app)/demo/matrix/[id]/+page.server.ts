import { mapboxDistanceMatrix } from '$lib/services/external/mapbox';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const user = locals.user;
	const mapId = params.id;

	try {
		// Get the first depot for this user's organization (simplified for demo)
		// In production, you'd want to select a specific depot
		const { depotService } = await import('$lib/services/server');
		const depots = await depotService.getDepots(user.organization_id);

		if (depots.length === 0) {
			error(400, 'No depots found. Please create a depot first.');
		}

		const firstDepot = depots[0];

		// Create distance matrix
		const result = await mapboxDistanceMatrix.createDistanceMatrix(
			mapId,
			firstDepot.depot.id,
			user.organization_id,
			{
				profile: 'mapbox/driving',
				annotations: 'duration,distance'
			}
		);

		return {
			title: `Distance Matrix - Map ${mapId}`,
			mapId,
			depotId: firstDepot.depot.id,
			depotName: firstDepot.depot.name,
			result
		};
	} catch (err) {
		console.error('Error creating distance matrix:', err);
		if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
			const serviceErr = err as { statusCode: number; message: string };
			error(serviceErr.statusCode, serviceErr.message);
		}
		error(500, 'Failed to create distance matrix');
	}
};
