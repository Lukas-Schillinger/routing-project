// DELETE /api/maps/[mapId]/routes/[routeId] - Delete a route (unassign driver from map)

import { db } from '$lib/server/db';
import { maps, routes } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId, routeId } = params;

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

		// Verify route exists and belongs to this map and organization
		const [route] = await db
			.select()
			.from(routes)
			.where(
				and(
					eq(routes.id, routeId),
					eq(routes.map_id, mapId),
					eq(routes.organization_id, user.organization_id)
				)
			)
			.limit(1);

		if (!route) {
			error(404, 'Route not found');
		}

		// Delete the route
		await db
			.delete(routes)
			.where(
				and(
					eq(routes.id, routeId),
					eq(routes.map_id, mapId),
					eq(routes.organization_id, user.organization_id)
				)
			);

		return json({ success: true, message: 'Route deleted successfully' });
	} catch (err) {
		console.error('Error deleting route:', err);
		error(500, 'Failed to delete route');
	}
};
