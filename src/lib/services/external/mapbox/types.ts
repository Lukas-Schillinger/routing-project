import { z } from 'zod';

// Mapbox API response schemas
export const mapboxErrorSchema = z.object({
	message: z.string(),
	code: z.string().optional()
});

export const coordinateSchema = z.tuple([z.number(), z.number()]); // [longitude, latitude]

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
export type MapboxError = z.infer<typeof mapboxErrorSchema>;
export type Coordinate = z.infer<typeof coordinateSchema>;
export type GeocodingFeature = z.infer<typeof geocodingFeatureSchema>;
export type GeocodingResponse = z.infer<typeof geocodingResponseSchema>;
