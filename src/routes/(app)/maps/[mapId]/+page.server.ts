import {
	depotService,
	driverService,
	mapService,
	optimizationService,
	routeService,
	ServiceError,
	stopService
} from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const user = requirePermission('resources:read');

	const { mapId } = params;

	if (!mapId) {
		throw error(400, { code: 'BAD_REQUEST', message: 'Map ID is required' });
	}

	try {
		// Fetch all data in parallel since they're independent
		const [
			map,
			mapStops,
			orgDrivers,
			assignedDriversData,
			depots,
			routes,
			activeJob
		] = await Promise.all([
			mapService.getMapById(mapId, user.organization_id),
			stopService.getStopsByMap(mapId, user.organization_id),
			driverService.getDrivers(user.organization_id),
			mapService.getDriversForMap(mapId, user.organization_id),
			depotService.getDepots(user.organization_id),
			routeService.getRoutesByMap(mapId, user.organization_id),
			optimizationService.getActiveJobForMap(mapId, user.organization_id)
		]);

		const assignedDrivers = assignedDriversData.map((d) => d.driver);

		// Determine if map is optimized (has stops with delivery_index set)
		const optimizedStops = mapStops.filter(
			(s) => s.stop.delivery_index !== null
		);
		const isViewMode =
			optimizedStops.length > 0 && optimizedStops.length === mapStops.length;

		return {
			map,
			stops: mapStops,
			allDrivers: orgDrivers,
			assignedDrivers,
			depots,
			routes,
			isViewMode,
			activeJob
		};
	} catch (err) {
		if (err instanceof ServiceError) {
			throw error(err.statusCode, { code: err.code, message: err.message });
		}
		throw err;
	}
};
