import { db } from '$lib/server/db';
import { drivers, locations, maps, routes, stops } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/demo/lucia/login');
	}

	const { mapId } = params;

	// Fetch map details
	const [map] = await db.select().from(maps).where(eq(maps.id, mapId)).limit(1);

	if (!map) {
		throw error(404, 'Map not found');
	}

	// Verify map belongs to user's organization
	if (map.organization_id !== user.organization_id) {
		throw error(403, 'Access denied');
	}

	// Fetch all stops with their location details
	const mapStops = await db
		.select({
			stop: stops,
			location: locations
		})
		.from(stops)
		.innerJoin(locations, eq(stops.location_id, locations.id))
		.where(eq(stops.map_id, mapId));

	// Fetch all drivers for this organization
	const orgDrivers = await db
		.select()
		.from(drivers)
		.where(eq(drivers.organization_id, user.organization_id));

	// Fetch routes for this map to see which drivers are assigned
	const mapRoutes = await db
		.select({
			route: routes,
			driver: drivers
		})
		.from(routes)
		.leftJoin(drivers, eq(routes.driver_id, drivers.id))
		.where(eq(routes.map_id, mapId));

	return {
		map,
		stops: mapStops,
		allDrivers: orgDrivers,
		assignedDrivers: mapRoutes
	};
};
