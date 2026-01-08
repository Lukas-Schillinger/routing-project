import { handleApiError, ServiceError } from '$lib/errors';
import { updateStopSchema } from '$lib/schemas/stop';
import { stopService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');
	const { stopId } = params;

	if (!stopId) {
		throw ServiceError.badRequest('Stop ID is required');
	}

	try {
		const stop = await stopService.getStopById(stopId, user.organization_id);
		return json(stop);
	} catch (err) {
		handleApiError(err, 'Failed to fetch stop');
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:update');

	const { stopId } = params;

	if (!stopId) {
		throw ServiceError.badRequest('Stop ID is required');
	}

	try {
		const body = await request.json();
		const data = updateStopSchema.parse(body);
		const stop = await stopService.updateStop(
			stopId,
			data,
			user.organization_id,
			user.id
		);
		return json(stop);
	} catch (err) {
		handleApiError(err, 'Failed to update stop');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const { stopId } = params;

	if (!stopId) {
		throw ServiceError.badRequest('Stop ID is required');
	}

	try {
		await stopService.deleteStop(stopId, user.organization_id);
		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to delete stop');
	}
};
