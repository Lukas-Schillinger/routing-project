// GET /api/depots/[depotId] - Get a specific depot
// PATCH /api/depots/[depotId] - Update a depot
// DELETE /api/depots/[depotId] - Delete a depot

import { handleApiError } from '$lib/errors';
import { depotUpdateSchema } from '$lib/schemas/depot';
import { depotService } from '$lib/services/server/depot.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	const { depotId } = params;

	try {
		const depotWithLocation = await depotService.getDepotById(depotId, user.organization_id);
		return json(depotWithLocation);
	} catch (err) {
		handleApiError(err, 'Failed to fetch depot');
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:update');

	const { depotId } = params;

	try {
		const body = await request.json();
		const validatedData = depotUpdateSchema.parse(body);

		const depotWithLocation = await depotService.updateDepot(
			depotId,
			validatedData,
			user.organization_id,
			user.id
		);

		return json(depotWithLocation);
	} catch (err) {
		handleApiError(err, 'Failed to update depot');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const { depotId } = params;

	try {
		const result = await depotService.deleteDepot(depotId, user.organization_id);
		return json(result);
	} catch (err) {
		handleApiError(err, 'Failed to delete depot');
	}
};
