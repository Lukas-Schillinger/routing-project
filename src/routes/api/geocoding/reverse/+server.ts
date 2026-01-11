import { handleApiError, ServiceError } from '$lib/errors';
import { mapboxGeocoding } from '$lib/services/external/mapbox';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/geocoding/reverse
 * Convert coordinates to an address (reverse geocoding)
 * Used when users drop a pin on the map
 */
export const GET: RequestHandler = async ({ url }) => {
	requirePermissionApi('resources:read');

	const lonParam = url.searchParams.get('lon');
	const latParam = url.searchParams.get('lat');

	if (!lonParam || !latParam) {
		throw ServiceError.badRequest('Missing required parameters: lon and lat');
	}

	const lon = Number(lonParam);
	const lat = Number(latParam);

	if (isNaN(lon) || isNaN(lat)) {
		throw ServiceError.badRequest(
			'Invalid coordinates: lon and lat must be numbers'
		);
	}

	try {
		const feature = await mapboxGeocoding.reverse(lon, lat);
		return json({ feature });
	} catch (err) {
		handleApiError(err, 'Failed to reverse geocode coordinates');
	}
};
