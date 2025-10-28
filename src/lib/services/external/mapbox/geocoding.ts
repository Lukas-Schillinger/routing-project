import { mapboxClient } from './client';
import { geocodingResponseSchema, type GeocodingFeature } from './types';

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
			types?: string[];
			bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
		} = {}
	): Promise<GeocodingFeature[]> {
		const params: Record<string, string> = {
			q: searchText,
			limit: String(options.limit || 5),
			country: options.country || 'US'
		};

		if (options.proximity) {
			params.proximity = options.proximity.join(',');
		}

		if (options.types?.length) {
			params.types = options.types.join(',');
		}

		if (options.bbox) {
			params.bbox = options.bbox.join(',');
		}

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
			types: 'address' // Only addresses by default for autocomplete
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
	 * Reverse geocoding - convert coordinates to address using v6 API
	 */
	async reverse(
		longitude: number,
		latitude: number,
		options: {
			types?: string[];
			limit?: number;
		} = {}
	): Promise<GeocodingFeature[]> {
		const params: Record<string, string> = {
			longitude: String(longitude),
			latitude: String(latitude),
			limit: String(options.limit || 1)
		};

		if (options.types?.length) {
			params.types = options.types.join(',');
		}

		const response = await mapboxClient.get<unknown>('/search/geocode/v6/reverse', params);
		const validated = geocodingResponseSchema.parse(response);
		return validated.features;
	}
}

// Singleton instance
export const mapboxGeocoding = new MapboxGeocodingService();
