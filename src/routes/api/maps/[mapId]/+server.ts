import { updateMapSchema } from '$lib/schemas/map';
import { mapService, ServiceError } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	const mapId = params.mapId;
	if (!mapId) {
		return json({ error: 'Map ID is required' }, { status: 400 });
	}

	try {
		const map = await mapService.getMapById(mapId, user.organization_id);

		return json({ map });
	} catch (error) {
		console.error('Get map error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to fetch map' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, params }) => {
	const user = requirePermissionApi('resources:update');

	const mapId = params.mapId;
	if (!mapId) {
		return json({ error: 'Map ID is required' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const data = updateMapSchema.parse(body);

		const map = await mapService.updateMap(mapId, data, user.organization_id, user.id);

		return json({ map });
	} catch (error) {
		console.error('Update map error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to update map' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const mapId = params.mapId;
	if (!mapId) {
		return json({ error: 'Map ID is required' }, { status: 400 });
	}

	try {
		await mapService.deleteMap(mapId, user.organization_id);

		return json({ success: true });
	} catch (error) {
		console.error('Delete map error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to delete map' }, { status: 500 });
	}
};
