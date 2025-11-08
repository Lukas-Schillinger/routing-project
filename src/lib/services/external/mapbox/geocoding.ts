import { mapboxClient } from './client';
import {
	batchGeocodingResponseSchema,
	geocodingResponseSchema,
	type GeocodingFeature,
	type GeocodingResponse
} from './types';

/** Types of features returned by mapbox. The documentation lists [country, region,
 * postcode, district, place, locality, neighborhood, street, address] but only mentions
 * "secondary_address" (suite, apt.) later in the documentation.
 *
 * The documentation lists "type" as an optional parameter for batch geocoding but it's
 * not actually applied.
 *
 * https://docs.mapbox.com/api/search/geocoding/
 */
const types = 'address,secondary_address';

/**
 * Geocoding service using Mapbox Geocoding v6 API
 * @see https://docs.mapbox.com/api/search/geocoding/
 */
export class MapboxGeocodingService {
	/**
	 * Forward geocoding - convert address to coordinates using v6 API
	 */
	async forward(
		searchText: string,
		options: {
			country?: string;
			proximity?: [number, number]; // [lon, lat]
			limit?: number;
		} = {}
	): Promise<GeocodingFeature[]> {
		const params: Record<string, string> = {
			q: searchText,
			limit: String(options.limit || 10),
			country: options.country || 'US'
		};

		if (options.proximity) {
			params.proximity = options.proximity.join(',');
		}

		params.types = types;

		const response = await mapboxClient.get<unknown>('/search/geocode/v6/forward', params);
		const validated = geocodingResponseSchema.parse(response);

		return validated.features;
	}

	/**
	 * Autocomplete - faster, optimized for autocomplete UI
	 * Returns empty array if query is too short
	 */
	async autocomplete(
		searchText: string,
		options: {
			country?: string;
			proximity?: [number, number];
			limit?: number;
			bbox?: [number, number, number, number];
		} = {}
	): Promise<GeocodingFeature[]> {
		// Don't search if query is too short
		if (searchText.trim().length < 2) {
			return [];
		}

		const params: Record<string, string> = {
			q: searchText,
			limit: String(options.limit || 8),
			country: options.country || 'US',
			autocomplete: 'true',
			types: types
		};

		if (options.proximity) {
			params.proximity = options.proximity.join(',');
		}

		if (options.bbox) {
			params.bbox = options.bbox.join(',');
		}

		const response = await mapboxClient.get<unknown>('/search/geocode/v6/forward', params);
		const validated = geocodingResponseSchema.parse(response);
		return validated.features;
	}

	/**
	 * Batch geocoding - geocode multiple addresses in a single request
	 * @see https://docs.mapbox.com/api/search/geocoding/#batch-geocoding
	 */
	async batch(
		searches: string[],
		options: {
			country?: string;
			limit?: number;
		} = {}
	): Promise<GeocodingResponse[]> {
		if (searches.length === 0) {
			return [];
		}

		if (searches.length > 50) {
			throw new Error('Batch geocoding supports a maximum of 50 searches per request');
		}

		const params: Record<string, string> = {
			country: options.country || 'US',
			limit: String(options.limit || 5),
			types: types
		};

		const body = searches.map((search) => ({ q: search }));

		const response = await mapboxClient.post<unknown>('/search/geocode/v6/batch', body, params);
		const batch = batchGeocodingResponseSchema.parse(response);

		const filtered = batch.batch.map((e) => {
			e.features = e.features.filter(
				(e) =>
					e.properties.feature_type == 'address' || e.properties.feature_type == 'secondary_address'
			);
			return e;
		});

		return filtered;
	}
}

// Singleton instance
export const mapboxGeocoding = new MapboxGeocodingService();
