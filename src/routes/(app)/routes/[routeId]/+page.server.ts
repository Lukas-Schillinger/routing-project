import { mapService, routeService, ServiceError, stopService } from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Check if route is public (temp driver) - no auth required
	const publicRoute = await routeService.getPublicRoute(params.routeId);

	// If not public, require authentication and use org-scoped access
	const route = publicRoute ?? (await routeService.getRouteByIdForUser(
		params.routeId,
		requirePermission('routes:read')
	));

	const orgId = route.organization_id;

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
