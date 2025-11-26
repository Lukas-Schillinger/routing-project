// GET /api/drivers/[driverId] - Get a specific driver
// PATCH /api/drivers/[driverId] - Update a driver
// DELETE /api/drivers/[driverId] - Delete a driver

import { driverUpdateSchema } from '$lib/schemas/driver';
import { authorizeRoute } from '$lib/services/server/auth';
import { driverService } from '$lib/services/server/driver.service';
import { ServiceError } from '$lib/services/server/errors';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = authorizeRoute();

	const { driverId } = params;

	try {
		const driver = await driverService.getDriverById(driverId, user.organization_id);
		return json(driver);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error fetching driver:', err);
		error(500, 'Failed to fetch driver');
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = authorizeRoute();

	const { driverId } = params;

	try {
		const body = await request.json();
		const validatedData = driverUpdateSchema.parse(body);

		const updatedDriver = await driverService.updateDriver(
			driverId,
			validatedData,
			user.organization_id
		);

		return json(updatedDriver);
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error updating driver:', err);
		error(500, 'Failed to update driver');
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const user = authorizeRoute();

	const { driverId } = params;

	try {
		const result = await driverService.deleteDriver(driverId, user.organization_id);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error deleting driver:', err);
		error(500, 'Failed to delete driver');
	}
};
