// GET /api/depots - List all depots for the organization
// POST /api/depots - Create a new depot

import { depotCreateSchema } from '$lib/schemas/depot';
import { authorizeRoute } from '$lib/services/server/auth';
import { depotService } from '$lib/services/server/depot.service';
import { ServiceError } from '$lib/services/server/errors';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const user = authorizeRoute();

	try {
		const depots = await depotService.getDepots(user.organization_id);
		return json(depots);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error fetching depots:', err);
		error(500, 'Failed to fetch depots');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const user = authorizeRoute();
	try {
		const body = await request.json();
		const validatedData = depotCreateSchema.parse(body);

		const depotWithLocation = await depotService.createDepot(validatedData, user.organization_id);

		return json(depotWithLocation, { status: 201 });
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error creating depot:', err);
		error(500, 'Failed to create depot');
	}
};
