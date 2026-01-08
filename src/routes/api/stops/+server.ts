import { handleApiError } from '$lib/errors';
import { createStopSchema } from '$lib/schemas/stop';
import { stopService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST /api/stops
 * Create a new stop
 */
export const POST: RequestHandler = async ({ request }) => {
	const user = requirePermissionApi('resources:create');

	try {
		const body = await request.json();
		const validatedData = createStopSchema.parse(body);

		const stop = await stopService.createStop(
			validatedData,
			user.organization_id,
			user.id
		);

		return json(stop, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to create stop');
	}
};
