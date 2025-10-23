import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, locations, maps, stops } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

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

	// Fetch assigned drivers (drivers assigned to this map via DriverMapMembership)
	const assignedDrivers = await db
		.select({
			driver: drivers
		})
		.from(driverMapMemberships)
		.innerJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
		.where(eq(driverMapMemberships.map_id, mapId));

	// Determine if map is optimized (has stops with delivery_index set)
	const optimizedStops = mapStops.filter((s) => s.stop.delivery_index !== null);
	const isViewMode = optimizedStops.length > 0 && optimizedStops.length === mapStops.length;

	return {
		map,
		stops: mapStops,
		allDrivers: orgDrivers,
		assignedDrivers: assignedDrivers.map((d) => d.driver),
		isViewMode
	};
};

export const actions: Actions = {
	resetOptimization: async ({ params, locals }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/demo/lucia/login');
		}

		const { mapId } = params;

		// Verify map belongs to user's organization
		const [map] = await db.select().from(maps).where(eq(maps.id, mapId)).limit(1);

		if (!map || map.organization_id !== user.organization_id) {
			throw error(403, 'Access denied');
		}

		// Reset all stops to unoptimized state
		await db
			.update(stops)
			.set({ driver_id: null, delivery_index: null, updated_at: new Date() })
			.where(eq(stops.map_id, mapId));

		return { success: true };
	}
};
