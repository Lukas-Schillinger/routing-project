import { stopService, driverService, mapService } from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

const DEFAULT_MAP_ID = '96082a8c-5767-40e2-aa92-051857854263';

export const load: PageServerLoad = async ({ url }) => {
	const user = requirePermission('resources:read');

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
