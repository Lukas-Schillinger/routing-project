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
	 * Batch geocoding - geocode multiple addresses at once
	 */
	async batch(
		addresses: string[]
	): Promise<Array<{ original: string; geocoded: GeocodingFeature | null }>> {
		const response = await apiClient.post<
			Array<{ original: string; geocoded: GeocodingFeature | null }>
		>('/geocoding/batch', { addresses });
		return response;
	}
}

// Singleton instance
export const geocodingApi = new GeocodingApiService();
