import { handleApiError } from '$lib/errors';
import { createMapSchema } from '$lib/schemas/map';
import { mapService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const user = requirePermissionApi('resources:read');
	try {
		const maps = await mapService.getMaps(user.organization_id);

		return json(maps);
	} catch (err) {
		handleApiError(err, 'Failed to fetch maps');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const user = requirePermissionApi('resources:create');

	try {
		const body = await request.json();
		const data = createMapSchema.parse(body);

		const result = await mapService.createMap(
			data,
			user.organization_id,
			user.id
		);

		return json(result, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to create map');
	}
};
