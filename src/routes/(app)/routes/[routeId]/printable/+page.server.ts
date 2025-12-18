import { mapService, routeService, ServiceError, stopService } from '$lib/services/server';
import { getUserOrRedirect } from '$lib/services/server/auth';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const user = getUserOrRedirect();

	const route = await routeService.getRouteById(params.routeId, user.organization_id);

	try {
		const [map, mapStops, assignedDriversData] = await Promise.all([
			mapService.getMapById(route.map_id, user.organization_id),
			(await stopService.getStopsByMap(route.map_id, user.organization_id)).filter(
				(e) => e.stop.driver_id == route.driver_id
			),
			mapService.getDriversForMap(route.map_id, user.organization_id)
		]);

		const assignedDrivers = assignedDriversData.map((d) => d.driver);
		const driver = assignedDrivers.find((d) => d.id === route.driver_id);

		const routedStops = mapStops.filter((s) => s.stop.delivery_index !== null);

		return {
			map,
			stops: routedStops,
			driver,
			route
		};
	} catch (err) {
		if (err instanceof ServiceError) {
			throw error(err.statusCode, err.message);
		}
		throw err;
	}
};
