// POST /api/maps/[mapId]/routes - Create a new route (assign driver to map)
// GET /api/maps/[mapId]/routes - List all routes for a map

import { db } from '$lib/server/db';
import { maps, routes } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		// Verify map belongs to user's organization
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, user.organization_id)))
			.limit(1);

		if (!map) {
			error(404, 'Map not found');
		}

		// Fetch all routes for this map
		const mapRoutes = await db
			.select()
			.from(routes)
			.where(and(eq(routes.map_id, mapId), eq(routes.organization_id, user.organization_id)));

		return json(mapRoutes);
	} catch (err) {
		console.error('Error fetching routes:', err);
		error(500, 'Failed to fetch routes');
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		// Verify map belongs to user's organization
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, user.organization_id)))
			.limit(1);

		if (!map) {
			error(404, 'Map not found');
		}

		const body = await request.json();
		const { driver_id } = body;

		if (!driver_id || typeof driver_id !== 'string') {
			error(400, 'Driver ID is required');
		}

		// Create a new route
		const [newRoute] = await db
			.insert(routes)
			.values({
				organization_id: user.organization_id,
				map_id: mapId,
				driver_id: driver_id,
				total_distance_m: 0,
				total_duration_s: 0
			})
			.returning();

		return json(newRoute, { status: 201 });
	} catch (err) {
		console.error('Error creating route:', err);
		error(500, 'Failed to create route');
	}
};
