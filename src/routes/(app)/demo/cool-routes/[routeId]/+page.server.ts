import { mapService, routeService, ServiceError, stopService } from '$lib/services/server';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/demo/lucia/login');
	}

	const route = await routeService.getRouteById(params.routeId, user.organization_id);

	try {
		// Fetch all other data in parallel using the actual map ID
		const [map, mapStops, assignedDriversData] = await Promise.all([
			mapService.getMapById(route.map_id, user.organization_id),
			(await stopService.getStopsByMap(route.map_id, user.organization_id)).filter(
				(e) => e.stop.driver_id == route.driver_id
			),
			mapService.getDriversForMap(route.map_id, user.organization_id)
		]);

		// Extract drivers from the membership data
		const assignedDrivers = assignedDriversData.map((d) => d.driver);

		// Filter stops to only include those with routes (delivery_index set)
		const routedStops = mapStops.filter((s) => s.stop.delivery_index !== null);

		return {
			map,
			stops: routedStops,
			assignedDrivers,
			route
		};
	} catch (err) {
		if (err instanceof ServiceError) {
			throw error(err.statusCode, err.message);
		}
		throw err;
	}
};
