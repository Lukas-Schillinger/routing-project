import { handleApiError } from '$lib/errors';
import { bulkCreateStopsSchema } from '$lib/schemas/stop';
import { stopService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/maps/[mapId]/stops
 * Bulk create stops for a map
 */
export const POST: RequestHandler = async ({ request, params }) => {
	const user = requirePermissionApi('resources:create');

	const mapId = params.mapId;

	try {
		const body = await request.json();
		const validatedData = bulkCreateStopsSchema.parse(body);

		const stops = await stopService.bulkCreateStops(
			validatedData,
			mapId,
			user.organization_id,
			user.id
		);

		return json(stops, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to create stops');
	}
};
