// GET /api/drivers - List all drivers for the organization
// POST /api/drivers - Create a new driver

import { handleApiError } from '$lib/errors';
import { driverCreateSchema } from '$lib/schemas/driver';
import { driverService } from '$lib/services/server/driver.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const user = requirePermissionApi('resources:read');

	try {
		const drivers = await driverService.getDrivers(user.organization_id);
		return json(drivers);
	} catch (err) {
		handleApiError(err, 'Failed to fetch drivers');
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
		handleApiError(err, 'Failed to create driver');
	}
};
