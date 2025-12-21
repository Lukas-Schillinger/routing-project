// GET /api/drivers - List all drivers for the organization
// POST /api/drivers - Create a new driver

import { driverCreateSchema } from '$lib/schemas/driver';
import { driverService } from '$lib/services/server/driver.service';
import { ServiceError } from '$lib/services/server/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const user = requirePermissionApi('resources:read');

	try {
		const drivers = await driverService.getDrivers(user.organization_id);
		return json(drivers);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error fetching drivers:', err);
		error(500, 'Failed to fetch drivers');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	const user = requirePermissionApi('resources:create');

	try {
		const body = await request.json();
		const validatedData = driverCreateSchema.parse(body);

		const newDriver = await driverService.createDriver(validatedData, user.organization_id, user.id);

		return json(newDriver, { status: 201 });
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error creating driver:', err);
		error(500, 'Failed to create driver');
	}
};
