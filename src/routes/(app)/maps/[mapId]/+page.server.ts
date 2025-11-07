import {
	depotService,
	driverService,
	mapService,
	routeService,
	ServiceError,
	stopService
} from '$lib/services/server';
import { getUserOrRedirect } from '$lib/services/server/auth';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const user = getUserOrRedirect();

	const { mapId } = params;

	if (!mapId) {
		throw error(400, 'Map ID is required');
	}

	try {
		// Fetch all data in parallel since they're independent
		const [map, mapStops, orgDrivers, assignedDriversData, depots, routes] = await Promise.all([
			mapService.getMapById(mapId, user.organization_id),
			stopService.getStopsByMap(mapId, user.organization_id),
			driverService.getDrivers(user.organization_id),
			mapService.getDriversForMap(mapId, user.organization_id),
			depotService.getDepots(user.organization_id),
			routeService.getRoutesByMap(mapId, user.organization_id)
		]);

		const assignedDrivers = assignedDriversData.map((d) => d.driver);

		// Determine if map is optimized (has stops with delivery_index set)
		const optimizedStops = mapStops.filter((s) => s.stop.delivery_index !== null);
		const isViewMode = optimizedStops.length > 0 && optimizedStops.length === mapStops.length;

		return {
			map,
			stops: mapStops,
			allDrivers: orgDrivers,
			assignedDrivers,
			depots,
			routes,
			isViewMode
		};
	} catch (err) {
		if (err instanceof ServiceError) {
			throw error(err.statusCode, err.message);
		}
		throw err;
	}
};
