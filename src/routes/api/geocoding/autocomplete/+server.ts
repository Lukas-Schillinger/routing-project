import { mapboxGeocoding } from '$lib/services/external/mapbox';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/geocoding/autocomplete
 * Autocomplete addresses as the user types
 * Supports proximity biasing for better local results
 */
export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q');
	const country = url.searchParams.get('country') || 'US';
	const limit = Number(url.searchParams.get('limit') || 8);
	const proximityParam = url.searchParams.get('proximity');

	if (!q || q.length < 2) {
		return json({ features: [] });
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

		// TODO: Could add IP-based geolocation fallback here
		// const clientIp = getClientAddress();

		const results = await mapboxGeocoding.autocomplete(q, {
			country,
			limit,
			proximity
		});

		return json({ features: results });
	} catch (err) {
		console.error('Geocoding autocomplete error:', err);
		error(500, 'Failed to geocode address');
	}
};
