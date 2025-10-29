import {
	depotService,
	driverService,
	mapService,
	ServiceError,
	stopService
} from '$lib/services/server';
import { error, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/demo/lucia/login');
	}

	const { mapId } = params;

	if (!mapId) {
		throw error(400, 'Map ID is required');
	}

	try {
		// Fetch all data in parallel since they're independent
		const [map, mapStops, orgDrivers, assignedDriversData, depots] = await Promise.all([
			mapService.getMapById(mapId, user.organization_id),
			stopService.getStopsByMap(mapId, user.organization_id),
			driverService.getDrivers(user.organization_id),
			mapService.getDriversForMap(mapId, user.organization_id),
			depotService.getDepots(user.organization_id)
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
			isViewMode
		};
	} catch (err) {
		if (err instanceof ServiceError) {
			throw error(err.statusCode, err.message);
		}
		throw err;
	}
};

export const actions: Actions = {
	resetOptimization: async ({ params, locals }) => {
		const user = locals.user;

		if (!user) {
			throw redirect(302, '/demo/lucia/login');
		}

		const { mapId } = params;

		if (!mapId) {
			throw error(400, 'Map ID is required');
		}

		try {
			// Reset optimization using the map service
			await mapService.resetOptimization(mapId, user.organization_id);

			return { success: true };
		} catch (err) {
			if (err instanceof ServiceError) {
				throw error(err.statusCode, err.message);
			}
			throw err;
		}
	}
};
