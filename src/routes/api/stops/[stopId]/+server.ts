import { updateStopSchema } from '$lib/schemas/stop';
import { stopService } from '$lib/services/server';
import { authorizeRoute } from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { ZodError } from 'zod';

export const GET: RequestHandler = async ({ params }) => {
	const user = authorizeRoute();
	const { stopId } = params;

	if (!stopId) {
		error(400, 'Stop ID is required');
	}

	try {
		const stop = await stopService.getStopById(stopId, user.organization_id);
		return json(stop);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error fetching stop:', err);
		error(500, 'Failed to fetch stop');
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = authorizeRoute();

	const { stopId } = params;

	if (!stopId) {
		error(400, 'Stop ID is required');
	}

	try {
		const body = await request.json();
		const data = updateStopSchema.parse(body);
		const stop = await stopService.updateStop(stopId, data, user.organization_id);
		return json(stop);
	} catch (err) {
		if (err instanceof ZodError) {
			error(400, `Validation error: ${err.errors.map((e) => e.message).join(', ')}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error updating stop:', err);
		error(500, 'Failed to update stop');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = authorizeRoute();

	const { stopId } = params;

	if (!stopId) {
		error(400, 'Stop ID is required');
	}

	try {
		await stopService.deleteStop(stopId, user.organization_id);
		return json({ success: true });
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error deleting stop:', err);
		error(500, 'Failed to delete stop');
	}
};
