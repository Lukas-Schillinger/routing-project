import { mapService, routeService, ServiceError, stopService } from '$lib/services/server';
import { authorizeRouteAccess } from '$lib/services/server/permissions';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const auth = await authorizeRouteAccess(params.routeId);

	const route =
		auth === 'public'
			? await routeService.getRouteById(params.routeId)
			: await routeService.getRouteByIdForUser(params.routeId, auth);

	const orgId = auth === 'public' ? route.organization_id : auth.organization_id;

	try {
		const [map, mapStops, assignedDriversData] = await Promise.all([
			mapService.getMapById(route.map_id, orgId),
			(await stopService.getStopsByMap(route.map_id, orgId)).filter(
				(e) => e.stop.driver_id == route.driver_id
			),
			mapService.getDriversForMap(route.map_id, orgId)
		]);

		const assignedDrivers = assignedDriversData.map((d) => d.driver);
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
