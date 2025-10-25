// GET /api/depots - List all depots for the organization
// POST /api/depots - Create a new depot

import { depotCreateSchema } from '$lib/schemas/depot';
import { db } from '$lib/server/db';
import { depots, locations } from '$lib/server/db/schema';
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
		// Fetch depots with their location details
		const orgDepots = await db
			.select()
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(eq(depots.organization_id, user.organization_id))
			.orderBy(depots.name);

		return json(orgDepots);
	} catch (err) {
		console.error('Error fetching depots:', err);
		error(500, 'Failed to fetch depots');
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
		const validatedData = depotCreateSchema.parse(body);

		let locationId = validatedData.location_id;

		// If location data is provided and no location_id, create the location first
		if (validatedData.location && !locationId) {
			const [newLocation] = await db
				.insert(locations)
				.values({
					organization_id: user.organization_id,
					name: validatedData.location.name || null,
					address_line1: validatedData.location.address_line1,
					address_line2: validatedData.location.address_line2 || null,
					city: validatedData.location.city || null,
					region: validatedData.location.region || null,
					postal_code: validatedData.location.postal_code || null,
					country: validatedData.location.country || 'US',
					lat: validatedData.location.lat || null,
					lon: validatedData.location.lon || null,
					geocode_provider: validatedData.location.geocode_provider || null,
					geocode_confidence: validatedData.location.geocode_confidence || null,
					geocode_place_id: validatedData.location.geocode_place_id || null,
					geocode_raw: validatedData.location.geocode_raw || null,
					address_hash: validatedData.location.address_hash || null
				})
				.returning();

			locationId = newLocation.id;
		}

		// If location_id is provided, verify it exists and belongs to the organization
		if (locationId) {
			const location = await db
				.select()
				.from(locations)
				.where(eq(locations.id, locationId))
				.limit(1);

			if (location.length === 0) {
				error(404, 'Location not found');
			}

			if (location[0].organization_id !== user.organization_id) {
				error(403, 'Location does not belong to your organization');
			}
		}

		// If setting as default depot, unset any existing default
		if (validatedData.default_depot) {
			await db
				.update(depots)
				.set({ default_depot: false, updated_at: new Date() })
				.where(eq(depots.organization_id, user.organization_id));
		}

		const [newDepot] = await db
			.insert(depots)
			.values({
				organization_id: user.organization_id,
				location_id: locationId!,
				name: validatedData.name.trim(),
				default_depot: validatedData.default_depot
			})
			.returning();

		// Fetch the depot with location details for the response
		const [depotWithLocation] = await db
			.select()
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(eq(depots.id, newDepot.id));

		return json(depotWithLocation, { status: 201 });
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		console.error('Error creating depot:', err);
		error(500, 'Failed to create depot');
	}
};
