import { handleApiError } from '$lib/errors';
import { reorderStopsSchema } from '$lib/schemas/stop';
import { stopService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/maps/[mapId]/stops/reorder
 * Bulk reorder stops - update driver assignments and delivery indices
 */
export const POST: RequestHandler = async ({ request, params }) => {
	const user = requirePermissionApi('resources:update');

	const mapId = params.mapId;

	try {
		const body = await request.json();
		const { updates } = reorderStopsSchema.parse(body);

		const stops = await stopService.reorderStops(
			mapId,
			updates,
			user.organization_id,
			user.id
		);

		return json(stops);
	} catch (err) {
		handleApiError(err, 'Failed to reorder stops');
	}
};
