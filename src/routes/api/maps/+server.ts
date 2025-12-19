import { createMapSchema } from '$lib/schemas/map';
import { mapService, ServiceError } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
	const user = requirePermissionApi('resources:read');
	try {
		// Parse query parameters
		const includeStats = url.searchParams.get('includeStats') === 'true';

		const maps = await mapService.getMaps(user.organization_id);

		return json({ maps, includeStats });
	} catch (error) {
		console.error('Get maps error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to fetch maps' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const user = requirePermissionApi('resources:create');

	try {
		const body = await request.json();
		const data = createMapSchema.parse(body);

		const result = await mapService.createMap(data, user.organization_id);

		return json(result, { status: 201 });
	} catch (error) {
		console.error('Create map error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to create map' }, { status: 500 });
	}
};
