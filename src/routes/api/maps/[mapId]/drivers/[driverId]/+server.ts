// DELETE /api/maps/[mapId]/drivers/[driverId] - Remove a driver from a map

import { handleApiError } from '$lib/errors';
import { mapService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	try {
		await mapService.removeDriverFromMap(
			params.driverId,
			params.mapId,
			user.organization_id
		);

		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to remove driver from map');
	}
};
