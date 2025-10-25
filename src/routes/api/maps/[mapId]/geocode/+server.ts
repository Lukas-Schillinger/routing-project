import { db } from '$lib/server/db';
import { locations, maps, stops } from '$lib/server/db/schema';
import { geocodingService } from '$lib/services/mapbox-geocoding';
import { geocodingFeatureToLocation } from '$lib/utils';
import { json } from '@sveltejs/kit';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
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

	const { mapId } = params;
	const body = await request.json();
	const records = body.records as GeocodeRecord[];

	if (!records || !Array.isArray(records) || records.length === 0) {
		return json({ error: 'No records provided' }, { status: 400 });
	}

	// Verify map belongs to user's org
	const [map] = await db.select().from(maps).where(eq(maps.id, mapId)).limit(1);

	if (!map || map.organization_id !== user.organization_id) {
		return json({ error: 'Map not found' }, { status: 404 });
	}

	const results = [];
	const errors = [];

	for (const record of records) {
		try {
			const addressHash = hashAddress(record.address);

			// Check if location already exists
			let [location] = await db
				.select()
				.from(locations)
				.where(eq(locations.address_hash, addressHash))
				.limit(1);

			if (!location) {
				// Geocode the address
				const geocodeResult = await geocodingService.geocode(record.address, {
					country: 'US',
					limit: 1
				});

				if (!geocodeResult || geocodeResult.features.length === 0) {
					errors.push({ record, error: 'No geocoding results found' });
					continue;
				}

				const feature = geocodeResult.features[0];

				// Convert geocoding feature to location data
				const locationData = geocodingFeatureToLocation(feature);

				// Create new location with additional fields from the record
				[location] = await db
					.insert(locations)
					.values({
						organization_id: user.organization_id,
						name: record.name,
						...locationData,
						address_hash: addressHash
					})
					.returning();
			}

			// Create stop linking location to map
			const [stop] = await db
				.insert(stops)
				.values({
					organization_id: user.organization_id,
					map_id: mapId,
					location_id: location.id,
					contact_name: record.name,
					contact_phone: record.phone || null,
					notes: record.notes || null
				})
				.returning();

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
};
