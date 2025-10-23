// GET /api/driver-map-memberships - List all driver-map memberships for the organization
// POST /api/driver-map-memberships - Create a new driver-map membership

import { createDriverMapMembershipSchema } from '$lib/schemas/driverMapMembership';
import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, maps } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	try {
		const mapId = url.searchParams.get('mapId');
		const driverId = url.searchParams.get('driverId');

		const query = db
			.select({
				id: driverMapMemberships.id,
				organization_id: driverMapMemberships.organization_id,
				driver_id: driverMapMemberships.driver_id,
				map_id: driverMapMemberships.map_id,
				created_at: driverMapMemberships.created_at,
				updated_at: driverMapMemberships.updated_at,
				driver: {
					id: drivers.id,
					name: drivers.name,
					phone: drivers.phone,
					notes: drivers.notes,
					active: drivers.active,
					temporary: drivers.temporary
				},
				map: {
					id: maps.id,
					title: maps.title
				}
			})
			.from(driverMapMemberships)
			.leftJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
			.leftJoin(maps, eq(driverMapMemberships.map_id, maps.id))
			.$dynamic();

		const conditions = [eq(driverMapMemberships.organization_id, user.organization_id)];

		if (mapId) {
			conditions.push(eq(driverMapMemberships.map_id, mapId));
		}

		if (driverId) {
			conditions.push(eq(driverMapMemberships.driver_id, driverId));
		}

		const memberships = await query.where(and(...conditions));

		return json(memberships);
	} catch (err) {
		console.error('Error fetching driver-map memberships:', err);
		error(500, 'Failed to fetch driver-map memberships');
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
		const validatedData = createDriverMapMembershipSchema.parse(body);

		// Verify driver belongs to organization
		const [driver] = await db
			.select()
			.from(drivers)
			.where(
				and(
					eq(drivers.id, validatedData.driver_id),
					eq(drivers.organization_id, user.organization_id)
				)
			)
			.limit(1);

		if (!driver) {
			error(404, 'Driver not found');
		}

		// Verify map belongs to organization
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, validatedData.map_id), eq(maps.organization_id, user.organization_id)))
			.limit(1);

		if (!map) {
			error(404, 'Map not found');
		}

		// Check if membership already exists
		const [existing] = await db
			.select()
			.from(driverMapMemberships)
			.where(
				and(
					eq(driverMapMemberships.driver_id, validatedData.driver_id),
					eq(driverMapMemberships.map_id, validatedData.map_id)
				)
			)
			.limit(1);

		if (existing) {
			error(409, 'Driver is already assigned to this map');
		}

		const [newMembership] = await db
			.insert(driverMapMemberships)
			.values({
				organization_id: user.organization_id,
				driver_id: validatedData.driver_id,
				map_id: validatedData.map_id
			})
			.returning();

		return json(newMembership, { status: 201 });
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		console.error('Error creating driver-map membership:', err);
		error(500, 'Failed to create driver-map membership');
	}
};
