import {
	depotService,
	driverService,
	mapService,
	stopService
} from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = requirePermission('resources:read');

	// Fetch all data in parallel since they're independent
	const [userMaps, userDepots, userDrivers, mapStats, stopCoordinates] =
		await Promise.all([
			mapService.getMaps(user.organization_id),
			depotService.getDepots(user.organization_id),
			driverService.getDrivers(user.organization_id),
			mapService.getMapListStats(user.organization_id),
			stopService.getStopCoordinates(user.organization_id)
		]);

	return {
		maps: userMaps,
		depots: userDepots,
		drivers: userDrivers,
		mapStats,
		stopCoordinates
	};
};
