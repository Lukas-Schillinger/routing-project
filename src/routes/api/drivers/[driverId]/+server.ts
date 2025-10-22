// GET /api/drivers/[driverId] - Get a specific driver
// PATCH /api/drivers/[driverId] - Update a driver
// DELETE /api/drivers/[driverId] - Delete a driver (only if not assigned to routes)

import { driverUpdateSchema } from '$lib/schemas/driver';
import { db } from '$lib/server/db';
import { drivers, routes } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { driverId } = params;

	try {
		const [driver] = await db
			.select()
			.from(drivers)
			.where(and(eq(drivers.id, driverId), eq(drivers.organization_id, user.organization_id)))
			.limit(1);

		if (!driver) {
			error(404, 'Driver not found');
		}

		return json(driver);
	} catch (err) {
		console.error('Error fetching driver:', err);
		error(500, 'Failed to fetch driver');
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { driverId } = params;

	try {
		// First verify the driver exists and belongs to this organization
		const [existingDriver] = await db
			.select()
			.from(drivers)
			.where(and(eq(drivers.id, driverId), eq(drivers.organization_id, user.organization_id)))
			.limit(1);

		if (!existingDriver) {
			error(404, 'Driver not found');
		}

		const body = await request.json();

		// Validate request body with Zod schema
		const validatedData = driverUpdateSchema.parse(body);

		// Build update object with only provided fields
		const updateData: Partial<typeof drivers.$inferInsert> = {
			updated_at: new Date()
		};

		if (validatedData.name !== undefined) {
			updateData.name = validatedData.name.trim();
		}

		if (validatedData.phone !== undefined) {
			updateData.phone = validatedData.phone?.trim() || null;
		}

		if (validatedData.notes !== undefined) {
			updateData.notes = validatedData.notes?.trim() || null;
		}

		if (validatedData.active !== undefined) {
			updateData.active = validatedData.active;
		}

		if (validatedData.temporary !== undefined) {
			updateData.temporary = validatedData.temporary;
		}

		const [updatedDriver] = await db
			.update(drivers)
			.set(updateData)
			.where(and(eq(drivers.id, driverId), eq(drivers.organization_id, user.organization_id)))
			.returning();

		return json(updatedDriver);
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		console.error('Error updating driver:', err);
		error(500, 'Failed to update driver');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { driverId } = params;

	try {
		// First verify the driver exists and belongs to this organization
		const [existingDriver] = await db
			.select()
			.from(drivers)
			.where(and(eq(drivers.id, driverId), eq(drivers.organization_id, user.organization_id)))
			.limit(1);

		if (!existingDriver) {
			error(404, 'Driver not found');
		}

		// Check if driver is assigned to any routes
		const assignedRoutes = await db
			.select({ id: routes.id })
			.from(routes)
			.where(and(eq(routes.driver_id, driverId), eq(routes.organization_id, user.organization_id)))
			.limit(1);

		if (assignedRoutes.length > 0) {
			error(
				409,
				'Cannot delete driver that is assigned to routes. Please remove the driver from all routes first.'
			);
		}

		// Delete the driver
		await db
			.delete(drivers)
			.where(and(eq(drivers.id, driverId), eq(drivers.organization_id, user.organization_id)));

		return json({ success: true, message: 'Driver deleted successfully' });
	} catch (err) {
		console.error('Error deleting driver:', err);
		error(500, 'Failed to delete driver');
	}
};
