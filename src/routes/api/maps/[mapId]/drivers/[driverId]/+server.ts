// DELETE /api/maps/[mapId]/drivers/[driverId] - Remove a driver from a map

import { mapService, ServiceError } from '$lib/services/server';
import { authorizeRoute } from '$lib/services/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const user = authorizeRoute();

	const mapId = params.mapId;
	const driverId = params.driverId;

	if (!mapId || !driverId) {
		return json({ error: 'Map ID and Driver ID are required' }, { status: 400 });
	}

	try {
		await mapService.removeDriverFromMap(driverId, mapId, user.organization_id);

		return json({ success: true, message: 'Driver removed from map successfully' });
	} catch (error) {
		console.error('Error removing driver from map:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to remove driver from map' }, { status: 500 });
	}
};
