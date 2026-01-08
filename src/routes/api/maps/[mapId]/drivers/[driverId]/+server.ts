// DELETE /api/maps/[mapId]/drivers/[driverId] - Remove a driver from a map

import { handleApiError } from '$lib/errors';
import { mapService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const mapId = params.mapId;
	const driverId = params.driverId;

	if (!mapId || !driverId) {
		return json(
			{ error: 'Map ID and Driver ID are required' },
			{ status: 400 }
		);
	}

	try {
		await mapService.removeDriverFromMap(driverId, mapId, user.organization_id);

		return json({
			success: true,
			message: 'Driver removed from map successfully'
		});
	} catch (err) {
		handleApiError(err, 'Failed to remove driver from map');
	}
};
