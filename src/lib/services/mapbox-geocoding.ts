import { z } from 'zod';
import { mapboxClient, type MapboxApiClient } from './mapbox-client.js';
import { coordinateSchema } from './mapbox-types.js';

// Geocoding v6 API schemas based on https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object

// Context sub-objects in v6
const contextSubObjectSchema = z.object({
	mapbox_id: z.string(),
	name: z.string(),
	wikidata_id: z.string().optional(),
	short_code: z.string().optional()
});

const addressContextSchema = contextSubObjectSchema.extend({
	address_number: z.string().optional(),
	street_name: z.string().optional()
});

const regionContextSchema = contextSubObjectSchema.extend({
	region_code: z.string().optional(),
	region_code_full: z.string().optional()
});

const countryContextSchema = contextSubObjectSchema.extend({
	country_code: z.string(),
	country_code_alpha_3: z.string()
});

const featureContextSchema = z.object({
	address: addressContextSchema.optional(),
	street: contextSubObjectSchema.optional(),
	neighborhood: contextSubObjectSchema.optional(),
	postcode: contextSubObjectSchema.optional(),
	locality: contextSubObjectSchema.optional(),
	place: contextSubObjectSchema.optional(),
	district: contextSubObjectSchema.optional(),
	region: regionContextSchema.optional(),
	country: countryContextSchema.optional()
});

// Main feature schema for v6
export const geocodingFeatureSchema = z.object({
	id: z.string(),
	type: z.literal('Feature'),
	geometry: z.object({
		type: z.literal('Point'),
		coordinates: coordinateSchema
	}),
	properties: z.object({
		mapbox_id: z.string(),
		feature_type: z.string(),
		name: z.string(),
		name_preferred: z.string().optional(),
		place_formatted: z.string().optional(),
		full_address: z.string().optional(),
		context: featureContextSchema.optional(),
		coordinates: z
			.object({
				longitude: z.number(),
				latitude: z.number(),
				accuracy: z.string().optional(),
				routable_points: z.array(z.any()).optional()
			})
			.optional(),
		bbox: z.array(z.number()).optional(),
		match_code: z.record(z.string(), z.string()).optional()
	})
});

export const geocodingResponseSchema = z.object({
	type: z.literal('FeatureCollection'),
	features: z.array(geocodingFeatureSchema),
	attribution: z.string()
});

// Type exports
export type GeocodingFeature = z.infer<typeof geocodingFeatureSchema>;
export type GeocodingResponse = z.infer<typeof geocodingResponseSchema>;

/**
 * Geocoding service using Mapbox Geocoding v6 API
 * @see https://docs.mapbox.com/api/search/geocoding/
 */
export class MapboxGeocodingService {
	constructor(private client: MapboxApiClient = mapboxClient) {}

	/**
	 * Forward geocoding - convert address to coordinates using v6 API
	 */
	async geocode(
		query: string,
		options: {
			country?: string;
			proximity?: [number, number];
			types?: string[];
			limit?: number;
			bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
		} = {}
	): Promise<GeocodingResponse> {
		const params = new URLSearchParams();
		params.set('q', query);

		if (options.country) params.set('country', options.country);
		if (options.proximity) params.set('proximity', options.proximity.join(','));
		if (options.types) params.set('types', options.types.join(','));
		if (options.limit) params.set('limit', options.limit.toString());
		if (options.bbox) params.set('bbox', options.bbox.join(','));

		const endpoint = `/search/geocode/v6/forward`;
		const url = `${endpoint}?${params.toString()}`;

		const response = await this.client.request<unknown>(url);
		return geocodingResponseSchema.parse(response);
	}

	/**
	 * Reverse geocoding - convert coordinates to address using v6 API
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
		params.set('longitude', longitude.toString());
		params.set('latitude', latitude.toString());

		if (options.types) params.set('types', options.types.join(','));
		if (options.limit) params.set('limit', options.limit.toString());

		const endpoint = `/search/geocode/v6/reverse`;
		const url = `${endpoint}?${params.toString()}`;

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
			bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
			limit?: number;
		} = {}
	): Promise<GeocodingResponse> {
		// Don't search if query is too short
		if (query.trim().length < 2) {
			return {
				type: 'FeatureCollection',
				features: [],
				attribution: ''
			};
		}

		const params = new URLSearchParams();
		params.set('q', query);

		// Default settings optimized for autocomplete
		params.set('types', 'address'); // Only addresses by default
		params.set('limit', (options.limit || 5).toString()); // Fewer results for autocomplete
		params.set('autocomplete', 'true'); // Enable autocomplete mode

		if (options.country) params.set('country', options.country);
		if (options.proximity) params.set('proximity', options.proximity.join(','));
		if (options.bbox) params.set('bbox', options.bbox.join(','));

		const endpoint = `/search/geocode/v6/forward`;
		const url = `${endpoint}?${params.toString()}`;

		const response = await this.client.request<unknown>(url);
		return geocodingResponseSchema.parse(response);
	}
}

/**
 * Default geocoding service instance
 */
export const geocodingService = new MapboxGeocodingService();
