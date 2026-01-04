// GET /api/drivers/[driverId] - Get a specific driver
// PATCH /api/drivers/[driverId] - Update a driver
// DELETE /api/drivers/[driverId] - Delete a driver

import { handleApiError } from '$lib/errors';
import { driverUpdateSchema } from '$lib/schemas/driver';
import { driverService } from '$lib/services/server/driver.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	const { driverId } = params;

	try {
		const driver = await driverService.getDriverById(driverId, user.organization_id);
		return json(driver);
	} catch (err) {
		handleApiError(err, 'Failed to fetch driver');
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:update');

	const { driverId } = params;

	try {
		const body = await request.json();
		const validatedData = driverUpdateSchema.parse(body);

		const updatedDriver = await driverService.updateDriver(
			driverId,
			validatedData,
			user.organization_id,
			user.id
		);

		return json(updatedDriver);
	} catch (err) {
		handleApiError(err, 'Failed to update driver');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:delete');

	const { driverId } = params;

	try {
		const result = await driverService.deleteDriver(driverId, user.organization_id);
		return json(result);
	} catch (err) {
		handleApiError(err, 'Failed to delete driver');
	}
};
