import { depotService, driverService, mapService, stopService } from '$lib/services/server';
import { getUserOrRedirect } from '$lib/services/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = getUserOrRedirect(locals);

	// Fetch all data in parallel since they're independent
	const [userMaps, userDepots, userDrivers, stops] = await Promise.all([
		mapService.getMaps(user.organization_id),
		depotService.getDepots(user.organization_id),
		driverService.getDrivers(user.organization_id),
		stopService.getStopsWithLocation(user.organization_id)
	]);

	return {
		maps: userMaps,
		depots: userDepots,
		drivers: userDrivers,
		stops: stops
	};
};
