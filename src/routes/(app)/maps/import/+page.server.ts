import { mapService } from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const user = requirePermission('resources:create');

	const mapId = url.searchParams.get('mapId');
	let existingMap = null;

	if (mapId) {
		try {
			existingMap = await mapService.getMapById(mapId, user.organization_id);
		} catch {
			// Map not found or not accessible - proceed with new map flow
		}
	}

	return {
		user,
		existingMap
	};
};
