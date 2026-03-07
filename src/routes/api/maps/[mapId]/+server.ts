import { handleApiError } from '$lib/errors';
import { updateMapSchema } from '$lib/schemas/map';
import { mapService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	const mapId = params.mapId;

	try {
		const map = await mapService.getMapById(mapId, user.organization_id);

		return json(map);
	} catch (err) {
		handleApiError(err, 'Failed to fetch map');
	}
};

export const PATCH: RequestHandler = async ({ request, params }) => {
	const user = requirePermissionApi('resources:update');

	const mapId = params.mapId;

	try {
		const body = await request.json();
		const data = updateMapSchema.parse(body);

		const map = await mapService.updateMap(
			mapId,
			data,
			user.organization_id,
			user.id
		);

		return json(map);
	} catch (err) {
		handleApiError(err, 'Failed to update map');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const mapId = params.mapId;

	try {
		await mapService.deleteMap(mapId, user.organization_id);

		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to delete map');
	}
};
