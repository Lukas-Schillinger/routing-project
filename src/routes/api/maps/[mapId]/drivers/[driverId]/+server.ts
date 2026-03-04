// DELETE /api/maps/[mapId]/drivers/[driverId] - Remove a driver from a map

import { handleApiError } from '$lib/errors';
import { mapService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const { mapId, driverId } = params;

	try {
		await mapService.removeDriverFromMap(
			driverId,
			mapId,
			user.organization_id,
			user.id
		);

		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to remove driver from map');
	}
};
