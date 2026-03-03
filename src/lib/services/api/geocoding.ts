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

		return apiClient.get<GeocodingFeature[]>('/geocoding/autocomplete', params);
	}

	/**
	 * Batch geocoding - geocode multiple addresses at once
	 */
	async batch(
		addresses: string[]
	): Promise<Array<{ original: string; geocoded: GeocodingFeature | null }>> {
		return apiClient.post<
			Array<{ original: string; geocoded: GeocodingFeature | null }>
		>('/geocoding/batch', { addresses });
	}

	/**
	 * Reverse geocoding - convert coordinates to an address
	 */
	async reverse(lon: number, lat: number): Promise<GeocodingFeature | null> {
		return apiClient.get<GeocodingFeature | null>('/geocoding/reverse', {
			lon: String(lon),
			lat: String(lat)
		});
	}
}

// Singleton instance
export const geocodingApi = new GeocodingApiService();
