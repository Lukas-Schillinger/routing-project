import { env } from '$env/dynamic/private';
import { describe, expect, it } from 'vitest';
import { mapboxGeocoding } from './geocoding';

const RUN_METERED = env.RUN_METERED === '1';

// Integration test - actually calls Mapbox Geocoding API
describe.skipIf(!RUN_METERED)('MapboxGeocodingService Integration Tests', () => {
	describe('forward geocoding', () => {
		it('should geocode a well-known address', async () => {
			const address = 'Times Square, New York, NY';

			const results = await mapboxGeocoding.forward(address);

			expect(results).toBeDefined();
			expect(results.length).toBeGreaterThan(0);

			const firstResult = results[0];
			expect(firstResult.geometry.coordinates).toBeDefined();
			expect(firstResult.geometry.coordinates).toHaveLength(2);

			const [lon, lat] = firstResult.geometry.coordinates;
			// Times Square should be roughly around these coordinates
			expect(lon).toBeCloseTo(-73.985, 1); // longitude
			expect(lat).toBeCloseTo(40.758, 1); // latitude
		});
	});

	describe('batch geocoding', () => {
		it('should batch geocode multiple well-known addresses', async () => {
			const addresses = [
				'Times Square, New York, NY',
				'Golden Gate Bridge, San Francisco, CA',
				'Space Needle, Seattle, WA'
			];

			const results = await mapboxGeocoding.batch(addresses);

			expect(results).toBeDefined();
			expect(results).toHaveLength(3);

			// Each address should return at least one result
			results.forEach((addressResults) => {
				expect(addressResults.features.length).toBeGreaterThan(0);
				expect(addressResults.features.at(0)?.geometry.coordinates).toHaveLength(2);
			});

			// Verify rough coordinates for each location
			const [nyResults, sfResults, seattleResults] = results;

			// New York (Times Square area)
			const [nyLon, nyLat] = nyResults.features[0].geometry.coordinates;
			expect(nyLon).toBeCloseTo(-73.985, 1);
			expect(nyLat).toBeCloseTo(40.758, 1);

			// San Francisco (Golden Gate Bridge area)
			const [sfLon, sfLat] = sfResults.features[0].geometry.coordinates;
			expect(sfLon).toBeCloseTo(-122.478, 1);
			expect(sfLat).toBeCloseTo(37.819, 1);

			// Seattle (Space Needle area)
			const [seattleLon, seattleLat] = seattleResults.features[0].geometry.coordinates;
			expect(seattleLon).toBeCloseTo(-122.349, 1);
			expect(seattleLat).toBeCloseTo(47.62, 1);
		});
	});
});
