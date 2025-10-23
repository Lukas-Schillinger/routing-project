// GET /api/maps/[mapId]/driver-memberships - Get all driver memberships for a map
// POST /api/maps/[mapId]/driver-memberships - Add a driver to a map
// DELETE /api/maps/[mapId]/driver-memberships/[driverId] - Remove a driver from a map

import { createDriverMapMembershipSchema } from '$lib/schemas/driverMapMembership';
import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, maps } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		// Verify map belongs to organization
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, user.organization_id)))
			.limit(1);

		if (!map) {
			error(404, 'Map not found');
		}

		// Get all driver memberships for this map
		const memberships = await db
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
				}
			})
			.from(driverMapMemberships)
			.leftJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
			.where(eq(driverMapMemberships.map_id, mapId))
			.orderBy(drivers.name);

		return json(memberships);
	} catch (err) {
		console.error('Error fetching driver memberships for map:', err);
		error(500, 'Failed to fetch driver memberships');
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		// Verify map belongs to organization
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, user.organization_id)))
			.limit(1);

		if (!map) {
			error(404, 'Map not found');
		}

		const body = await request.json();

		// Validate - allow either full schema or just driver_id
		let driverId: string;
		if (typeof body.driver_id === 'string') {
			driverId = body.driver_id;
		} else {
			const validatedData = createDriverMapMembershipSchema.parse(body);
			driverId = validatedData.driver_id;
		}

		// Verify driver belongs to organization
		const [driver] = await db
			.select()
			.from(drivers)
			.where(and(eq(drivers.id, driverId), eq(drivers.organization_id, user.organization_id)))
			.limit(1);

		if (!driver) {
			error(404, 'Driver not found');
		}

		// Check if membership already exists
		const [existing] = await db
			.select()
			.from(driverMapMemberships)
			.where(
				and(eq(driverMapMemberships.driver_id, driverId), eq(driverMapMemberships.map_id, mapId))
			)
			.limit(1);

		if (existing) {
			error(409, 'Driver is already assigned to this map');
		}

		const [newMembership] = await db
			.insert(driverMapMemberships)
			.values({
				organization_id: user.organization_id,
				driver_id: driverId,
				map_id: mapId
			})
			.returning();

		return json(newMembership, { status: 201 });
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		console.error('Error creating driver membership for map:', err);
		error(500, 'Failed to create driver membership');
	}
};
