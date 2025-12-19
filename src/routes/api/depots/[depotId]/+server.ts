// GET /api/depots/[depotId] - Get a specific depot
// PATCH /api/depots/[depotId] - Update a depot
// DELETE /api/depots/[depotId] - Delete a depot

import { depotUpdateSchema } from '$lib/schemas/depot';
import { depotService } from '$lib/services/server/depot.service';
import { ServiceError } from '$lib/services/server/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	const { depotId } = params;

	try {
		const depotWithLocation = await depotService.getDepotById(depotId, user.organization_id);
		return json(depotWithLocation);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error fetching depot:', err);
		error(500, 'Failed to fetch depot');
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
			user.organization_id
		);

		return json(depotWithLocation);
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error updating depot:', err);
		error(500, 'Failed to update depot');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const { depotId } = params;

	try {
		const result = await depotService.deleteDepot(depotId, user.organization_id);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error deleting depot:', err);
		error(500, 'Failed to delete depot');
	}
};
