import {
	depotService,
	driverService,
	mapService,
	stopService
} from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const user = requirePermission('resources:read');

	// Parse URL params for persisted state
	const searchQuery = url.searchParams.get('q') ?? '';
	const viewMode =
		(url.searchParams.get('view') as 'list' | 'compact') || 'compact';
	const sortColumn =
		(url.searchParams.get('sort') as 'created_at' | 'title' | 'stops') ||
		'created_at';
	const sortDirection =
		(url.searchParams.get('dir') as 'asc' | 'desc') || 'desc';
	const currentPage = Math.max(
		1,
		parseInt(url.searchParams.get('page') ?? '1', 10) || 1
	);

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
		stopCoordinates,
		// Persisted state from URL params
		initialState: {
			searchQuery,
			viewMode,
			sortColumn,
			sortDirection,
			currentPage
		}
	};
};
