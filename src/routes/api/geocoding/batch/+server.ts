import { mapboxGeocoding } from '$lib/services/external/mapbox';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { addresses } = await request.json();

		if (!Array.isArray(addresses)) {
			error(400, 'addresses must be an array of strings');
		}

		if (addresses.length === 0) {
			return json([]);
		}

		// Mapbox batch API has a limit of 50
		if (addresses.length > 50) {
			error(400, 'Batch geocoding supports a maximum of 50 addresses per request');
		}

		const results = await mapboxGeocoding.batch(addresses);

		const mappedResults = results.map((result, index) => ({
			original: addresses[index],
			geocoded: result.features[0] || null
		}));

		return json(mappedResults);
	} catch (err) {
		console.error('Batch geocoding error:', err);
		if (err instanceof Error && err.message.includes('maximum of 50')) {
			error(400, err.message);
		}
		error(500, 'Failed to batch geocode addresses');
	}
};
