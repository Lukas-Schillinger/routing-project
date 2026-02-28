import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
import { driverService, mapService, stopService } from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

const DEFAULT_MAP_ID = '4dcb008e-0fdc-439c-8a4d-f9085121dd77';

export const load: PageServerLoad = async ({ url, depends }) => {
	const user = requirePermission('resources:read');
	depends(INVALIDATION_KEYS.DEMO);

	const mapId = url.searchParams.get('mapId') || DEFAULT_MAP_ID;

	const [stops, drivers, assignedDriversData] = await Promise.all([
		stopService.getStopsByMap(mapId, user.organization_id),
		driverService.getDrivers(user.organization_id),
		mapService.getDriversForMap(mapId, user.organization_id)
	]);

	const assignedDrivers = assignedDriversData.map((d) => d.driver);

	return {
		mapId,
		stops,
		drivers,
		assignedDrivers
	};
};
