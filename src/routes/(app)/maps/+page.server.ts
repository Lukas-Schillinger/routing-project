import { depotService, driverService, mapService, stopService } from '$lib/services/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/demo/lucia/login');
	}

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
