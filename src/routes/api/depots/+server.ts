// GET /api/depots - List all depots for the organization
// POST /api/depots - Create a new depot

import { handleApiError } from '$lib/errors';
import { depotCreateSchema } from '$lib/schemas/depot';
import { depotService } from '$lib/services/server/depot.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const user = requirePermissionApi('resources:read');

	try {
		const depots = await depotService.getDepots(user.organization_id);
		return json(depots);
	} catch (err) {
		handleApiError(err, 'Failed to fetch depots');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const user = requirePermissionApi('resources:create');
	try {
		const body = await request.json();
		const validatedData = depotCreateSchema.parse(body);

		const depotWithLocation = await depotService.createDepot(validatedData, user.organization_id, user.id);

		return json(depotWithLocation, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to create depot');
	}
};
