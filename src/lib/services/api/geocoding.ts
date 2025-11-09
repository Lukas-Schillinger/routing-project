import type { GeocodingFeature } from '$lib/services/external/mapbox/types';
import { apiClient } from './base';

/**
 * Client-side geocoding API service
 * Wraps the /api/geocoding endpoints
 */
class GeocodingApiService {
	/**
	 * Autocomplete addresses as the user types
	 */
	async autocomplete(
		query: string,
		options: {
			country?: string;
			limit?: number;
			proximity?: [number, number]; // [lon, lat]
		} = {}
	): Promise<GeocodingFeature[]> {
		if (query.length < 2) {
			return [];
		}

		const params: Record<string, string> = { q: query };
		if (options.country) params.country = options.country;
		if (options.limit) params.limit = String(options.limit);
		if (options.proximity) params.proximity = options.proximity.join(',');

		const response = await apiClient.get<{ features: GeocodingFeature[] }>(
			'/geocoding/autocomplete',
			params
		);
		return response.features;
	}

	/**
	 * Forward geocoding - convert address to coordinates
	 */
	async forward(
		query: string,
		options: {
			country?: string;
			limit?: number;
			proximity?: [number, number];
		} = {}
	): Promise<GeocodingFeature[]> {
		const params: Record<string, string> = { q: query };
		if (options.country) params.country = options.country;
		if (options.limit) params.limit = String(options.limit);
		if (options.proximity) params.proximity = options.proximity.join(',');

		const response = await apiClient.get<{ features: GeocodingFeature[] }>(
			'/geocoding/forward',
			params
		);
		return response.features;
	}
}

// Singleton instance
export const geocodingApi = new GeocodingApiService();
