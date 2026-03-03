import { handleApiError } from '$lib/errors';
import { mapboxGeocoding } from '$lib/services/external/mapbox';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/geocoding/autocomplete
 * Autocomplete addresses as the user types
 * Supports proximity biasing for better local results
 */
export const GET: RequestHandler = async ({ url }) => {
	requirePermissionApi('resources:read');

	const q = url.searchParams.get('q');
	const country = url.searchParams.get('country') || 'US';
	const limit = Number(url.searchParams.get('limit') || 8);
	const proximityParam = url.searchParams.get('proximity');

	if (!q || q.length < 2) {
		return json([]);
	}

	try {
		// Parse proximity if provided (format: "lon,lat")
		let proximity: [number, number] | undefined;
		if (proximityParam) {
			const [lon, lat] = proximityParam.split(',').map(Number);
			if (!isNaN(lon) && !isNaN(lat)) {
				proximity = [lon, lat];
			}
		}

		const results = await mapboxGeocoding.autocomplete(q, {
			country,
			limit,
			proximity
		});

		return json(results);
	} catch (err) {
		handleApiError(err, 'Failed to geocode address');
	}
};
