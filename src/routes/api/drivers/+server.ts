// GET /api/drivers - List all drivers for the organization
// POST /api/drivers - Create a new driver

import { driverCreateSchema } from '$lib/schemas/driver';
import { db } from '$lib/server/db';
import { drivers } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	try {
		const orgDrivers = await db
			.select()
			.from(drivers)
			.where(eq(drivers.organization_id, user.organization_id))
			.orderBy(drivers.name);

		return json(orgDrivers);
	} catch (err) {
		console.error('Error fetching drivers:', err);
		error(500, 'Failed to fetch drivers');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();

		// Validate request body with Zod schema
		const validatedData = driverCreateSchema.parse(body);

		const [newDriver] = await db
			.insert(drivers)
			.values({
				organization_id: user.organization_id,
				name: validatedData.name.trim(),
				phone: validatedData.phone?.trim() || null,
				notes: validatedData.notes?.trim() || null,
				active: validatedData.active,
				temporary: validatedData.temporary
			})
			.returning();

		return json(newDriver, { status: 201 });
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		console.error('Error creating driver:', err);
		error(500, 'Failed to create driver');
	}
};
