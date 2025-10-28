import { mapboxGeocoding } from '$lib/services/external/mapbox';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET /api/geocoding/forward
 * Forward geocoding - convert address to coordinates
 */
export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q');
	const country = url.searchParams.get('country') || 'US';
	const limit = Number(url.searchParams.get('limit') || 5);

	if (!q || q.length < 3) {
		error(400, 'Query parameter "q" must be at least 3 characters');
	}

	try {
		const results = await mapboxGeocoding.forward(q, {
			country,
			limit
		});

		return json({ features: results });
	} catch (err) {
		console.error('Geocoding forward error:', err);
		error(500, 'Failed to geocode address');
	}
};
