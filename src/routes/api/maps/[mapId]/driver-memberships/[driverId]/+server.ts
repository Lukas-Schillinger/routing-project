// DELETE /api/maps/[mapId]/driver-memberships/[driverId] - Remove a driver from a map

import { db } from '$lib/server/db';
import { driverMapMemberships, maps } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId, driverId } = params;

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

		// Verify membership exists
		const [membership] = await db
			.select()
			.from(driverMapMemberships)
			.where(
				and(
					eq(driverMapMemberships.driver_id, driverId),
					eq(driverMapMemberships.map_id, mapId),
					eq(driverMapMemberships.organization_id, user.organization_id)
				)
			)
			.limit(1);

		if (!membership) {
			error(404, 'Driver is not assigned to this map');
		}

		await db
			.delete(driverMapMemberships)
			.where(
				and(
					eq(driverMapMemberships.driver_id, driverId),
					eq(driverMapMemberships.map_id, mapId),
					eq(driverMapMemberships.organization_id, user.organization_id)
				)
			);

		return json({ success: true, message: 'Driver removed from map successfully' });
	} catch (err) {
		console.error('Error removing driver from map:', err);
		error(500, 'Failed to remove driver from map');
	}
};
