import { handleApiError, ServiceError } from '$lib/errors';
import { mapboxGeocoding } from '$lib/services/external/mapbox';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	requirePermissionApi('resources:read');
	try {
		const { addresses } = await request.json();

		if (!Array.isArray(addresses)) {
			throw ServiceError.badRequest('addresses must be an array of strings');
		}

		if (addresses.length === 0) {
			return json([]);
		}

		// Mapbox batch API has a limit of 50
		if (addresses.length > 50) {
			throw ServiceError.badRequest(
				'Batch geocoding supports a maximum of 50 addresses per request'
			);
		}

		const results = await mapboxGeocoding.batch(addresses);

		const mappedResults = results.map((result, index) => ({
			original: addresses[index],
			geocoded: result.features[0] || null
		}));

		return json(mappedResults);
	} catch (err) {
		handleApiError(err, 'Failed to batch geocode addresses');
	}
};
