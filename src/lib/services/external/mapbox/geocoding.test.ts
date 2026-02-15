import { env } from '$env/dynamic/private';
import { describe, expect, it } from 'vitest';
import { mapboxGeocoding } from './geocoding';

const RUN_METERED = env.RUN_METERED === '1';

// Integration test - actually calls Mapbox Geocoding API
describe.skipIf(!RUN_METERED)(
	'MapboxGeocodingService Integration Tests',
	() => {
		describe('reverse geocoding', () => {
			it('should return an address for San Francisco coordinates', async () => {
				// Coordinates near downtown San Francisco
				const lon = -122.4194;
				const lat = 37.7749;

				const result = await mapboxGeocoding.reverse(lon, lat);

				expect(result).not.toBeNull();
				expect(result?.geometry.coordinates).toHaveLength(2);
				expect(result?.properties.full_address).toBeDefined();

				// Verify the returned coordinates are close to input
				const [resultLon, resultLat] = result!.geometry.coordinates;
				expect(resultLon).toBeCloseTo(lon, 1);
				expect(resultLat).toBeCloseTo(lat, 1);
			});

			it('should return null for coordinates in the ocean', async () => {
				// Middle of the Pacific Ocean
				const lon = -160.0;
				const lat = 20.0;

				const result = await mapboxGeocoding.reverse(lon, lat);

				expect(result).toBeNull();
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
					expect(
						addressResults.features.at(0)?.geometry.coordinates
					).toHaveLength(2);
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
				const [seattleLon, seattleLat] =
					seattleResults.features[0].geometry.coordinates;
				expect(seattleLon).toBeCloseTo(-122.349, 1);
				expect(seattleLat).toBeCloseTo(47.62, 1);
			});
		});
	}
);
