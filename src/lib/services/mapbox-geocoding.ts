import { z } from 'zod';
import { mapboxClient, type MapboxApiClient } from './mapbox-client.js';
import { coordinateSchema } from './mapbox-types.js';

// Geocoding specific schemas
export const geocodingFeatureSchema = z.object({
	id: z.string(),
	type: z.literal('Feature'),
	place_type: z.array(z.string()),
	relevance: z.number(),
	address: z.string().optional(),
	properties: z.record(z.string(), z.unknown()),
	text: z.string(),
	place_name: z.string(),
	center: coordinateSchema,
	geometry: z.object({
		type: z.literal('Point'),
		coordinates: coordinateSchema
	}),
	context: z
		.array(
			z.object({
				id: z.string(),
				text: z.string(),
				short_code: z.string().optional()
			})
		)
		.optional()
});

export const geocodingResponseSchema = z.object({
	type: z.literal('FeatureCollection'),
	query: z.array(z.string()),
	features: z.array(geocodingFeatureSchema),
	attribution: z.string()
});

// Type exports
export type GeocodingFeature = z.infer<typeof geocodingFeatureSchema>;
export type GeocodingResponse = z.infer<typeof geocodingResponseSchema>;

/**
 * Geocoding service using Mapbox API
 */
export class MapboxGeocodingService {
	constructor(private client: MapboxApiClient = mapboxClient) {}

	/**
	 * Forward geocoding - convert address to coordinates
	 */
	async geocode(
		query: string,
		options: {
			country?: string;
			proximity?: [number, number];
			types?: string[];
			limit?: number;
		} = {}
	): Promise<GeocodingResponse> {
		const params = new URLSearchParams();

		if (options.country) params.set('country', options.country);
		if (options.proximity) params.set('proximity', options.proximity.join(','));
		// Default to address type if no types specified
		const types = options.types || ['address'];
		params.set('types', types.join(','));
		if (options.limit) params.set('limit', options.limit.toString());

		const endpoint = `/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
		const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

		const response = await this.client.request<unknown>(url);
		return geocodingResponseSchema.parse(response);
	}

	/**
	 * Reverse geocoding - convert coordinates to address
	 */
	async reverseGeocode(
		longitude: number,
		latitude: number,
		options: {
			types?: string[];
			limit?: number;
		} = {}
	): Promise<GeocodingResponse> {
		const params = new URLSearchParams();

		if (options.types) params.set('types', options.types.join(','));
		if (options.limit) params.set('limit', options.limit.toString());

		const endpoint = `/geocoding/v5/mapbox.places/${longitude},${latitude}.json`;
		const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

		const response = await this.client.request<unknown>(url);
		return geocodingResponseSchema.parse(response);
	}

	/**
	 * Address autocomplete - get suggestions as user types
	 * Optimized for fast, lightweight responses for autocomplete UI
	 */
	async autocomplete(
		query: string,
		options: {
			country?: string;
			proximity?: [number, number];
			bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
			limit?: number;
		} = {}
	): Promise<GeocodingResponse> {
		// Don't search if query is too short
		if (query.trim().length < 2) {
			return {
				type: 'FeatureCollection',
				query: [query],
				features: [],
				attribution: ''
			};
		}

		const params = new URLSearchParams();

		// Default settings optimized for autocomplete
		params.set('types', 'address'); // Only addresses by default
		params.set('limit', (options.limit || 5).toString()); // Fewer results for autocomplete
		params.set('autocomplete', 'true'); // Enable autocomplete mode

		if (options.country) params.set('country', options.country);
		if (options.proximity) params.set('proximity', options.proximity.join(','));
		if (options.bbox) params.set('bbox', options.bbox.join(','));

		const endpoint = `/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`;
		const url = `${endpoint}?${params.toString()}`;

		const response = await this.client.request<unknown>(url);
		return geocodingResponseSchema.parse(response);
	}
}

/**
 * Default geocoding service instance
 */
export const geocodingService = new MapboxGeocodingService();
