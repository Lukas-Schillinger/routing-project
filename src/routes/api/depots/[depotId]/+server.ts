// GET /api/depots/[depotId] - Get a specific depot
// PATCH /api/depots/[depotId] - Update a depot
// DELETE /api/depots/[depotId] - Delete a depot

import { depotUpdateSchema } from '$lib/schemas/depot';
import { db } from '$lib/server/db';
import { depots, locations } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { depotId } = params;

	try {
		// Fetch depot with location details
		const [depotWithLocation] = await db
			.select()
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(and(eq(depots.id, depotId), eq(depots.organization_id, user.organization_id)))
			.limit(1);

		if (!depotWithLocation) {
			error(404, 'Depot not found');
		}

		return json(depotWithLocation);
	} catch (err) {
		console.error('Error fetching depot:', err);
		error(500, 'Failed to fetch depot');
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { depotId } = params;

	try {
		// First verify the depot exists and belongs to this organization
		const [existingDepot] = await db
			.select()
			.from(depots)
			.where(and(eq(depots.id, depotId), eq(depots.organization_id, user.organization_id)))
			.limit(1);

		if (!existingDepot) {
			error(404, 'Depot not found');
		}

		const body = await request.json();

		// Validate request body with Zod schema
		const validatedData = depotUpdateSchema.parse(body);

		// If updating location, verify it exists and belongs to the organization
		if (validatedData.location_id) {
			const [location] = await db
				.select()
				.from(locations)
				.where(eq(locations.id, validatedData.location_id))
				.limit(1);

			if (!location) {
				error(404, 'Location not found');
			}

			if (location.organization_id !== user.organization_id) {
				error(403, 'Location does not belong to your organization');
			}
		}

		// If setting as default depot, unset any existing default
		if (validatedData.default_depot === true) {
			await db
				.update(depots)
				.set({ default_depot: false, updated_at: new Date() })
				.where(
					and(eq(depots.organization_id, user.organization_id), eq(depots.default_depot, true))
				);
		}

		// Build update object with only provided fields
		const updateData: Partial<typeof depots.$inferInsert> = {
			updated_at: new Date()
		};

		if (validatedData.name !== undefined) {
			updateData.name = validatedData.name.trim();
		}

		if (validatedData.location_id !== undefined) {
			updateData.location_id = validatedData.location_id;
		}

		if (validatedData.default_depot !== undefined) {
			updateData.default_depot = validatedData.default_depot;
		}

		const [updatedDepot] = await db
			.update(depots)
			.set(updateData)
			.where(and(eq(depots.id, depotId), eq(depots.organization_id, user.organization_id)))
			.returning();

		// Fetch the updated depot with location details for the response
		const [depotWithLocation] = await db
			.select()
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(eq(depots.id, updatedDepot.id));

		return json(depotWithLocation);
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		console.error('Error updating depot:', err);
		error(500, 'Failed to update depot');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { depotId } = params;

	try {
		// First verify the depot exists and belongs to this organization
		const [existingDepot] = await db
			.select()
			.from(depots)
			.where(and(eq(depots.id, depotId), eq(depots.organization_id, user.organization_id)))
			.limit(1);

		if (!existingDepot) {
			error(404, 'Depot not found');
		}

		// Delete the depot
		await db
			.delete(depots)
			.where(and(eq(depots.id, depotId), eq(depots.organization_id, user.organization_id)));

		return json({ success: true, message: 'Depot deleted successfully' });
	} catch (err) {
		console.error('Error deleting depot:', err);
		error(500, 'Failed to delete depot');
	}
};
