import { mapboxGeocoding } from '$lib/services/external/mapbox';
import { locationService, mapService, ServiceError, stopService } from '$lib/services/server';
import { geocodingFeatureToLocation } from '$lib/utils';
import { json } from '@sveltejs/kit';
import { createHash } from 'crypto';
import type { RequestHandler } from './$types';

function hashAddress(address: string): string {
	return createHash('sha256').update(address.toLowerCase().trim()).digest('hex');
}

interface GeocodeRecord {
	name: string;
	address: string;
	phone?: string | null;
	notes?: string | null;
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const mapId = params.mapId;
	if (!mapId) {
		return json({ error: 'Map ID is required' }, { status: 400 });
	}

	const body = await request.json();
	const records = body.records as GeocodeRecord[];

	if (!records || !Array.isArray(records) || records.length === 0) {
		return json({ error: 'No records provided' }, { status: 400 });
	}

	try {
		// Verify map ownership
		await mapService.getMapById(mapId, user.organization_id);

		const results = [];
		const errors = [];

		for (const record of records) {
			try {
				const addressHash = hashAddress(record.address);

				// Check if location already exists
				let location = await locationService.getLocationByHash(addressHash, user.organization_id);

				if (!location) {
					// Geocode the address
					const features = await mapboxGeocoding.forward(record.address, {
						country: 'US',
						limit: 1
					});

					if (!features || features.length === 0) {
						errors.push({ record, error: 'No geocoding results found' });
						continue;
					}

					const feature = features[0];

					// Convert geocoding feature to location data
					const locationData = geocodingFeatureToLocation(feature);

					// Create new location
					location = await locationService.createLocation(
						{
							name: record.name,
							...locationData,
							address_hash: addressHash
						},
						user.organization_id
					);
				}

				// Create stop using stopService.bulkCreateStops
				const [stop] = await stopService.bulkCreateStops(
					[
						{
							location_id: location.id,
							contact_name: record.name,
							contact_phone: record.phone || null,
							notes: record.notes || null
						}
					],
					mapId,
					user.organization_id
				);

				results.push({
					record,
					location,
					stop
				});
			} catch (error) {
				console.error('Geocoding error:', error);
				errors.push({
					record,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return json({
			success: true,
			geocoded: results.length,
			failed: errors.length,
			results,
			errors
		});
	} catch (error) {
		console.error('Geocode endpoint error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to geocode records' }, { status: 500 });
	}
};
