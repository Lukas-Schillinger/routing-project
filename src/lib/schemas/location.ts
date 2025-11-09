import { z } from 'zod';

/**
 * Mapbox Geocoding v6 confidence levels
 */
export const geocodeConfidenceSchema = z.enum(['exact', 'high', 'medium', 'low']).nullable();

/**
 * Location schema - represents a geocoded physical address
 */
export const locationSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	created_at: z.date(),
	updated_at: z.date(),

	address_line_1: z.string().max(240),
	address_line_2: z.string().max(240).nullable(),

	address_number: z.string().max(240),
	street_name: z.string().max(240),
	city: z.string().max(120).nullable(),
	region: z.string().max(120).nullable(),
	postal_code: z.string().max(40).nullable(),
	country: z.string().length(2),

	lat: z.number(),
	lon: z.number(),

	geocode_raw: z.unknown(),
	geocode_confidence: geocodeConfidenceSchema,
	geocode_provider: z.string().max(40).nullable(),
	geocode_place_id: z.string().nullable(),
	address_hash: z.string().max(64).nullable()
});

/**
 * Type inferred from the location schema
 */
export type Location = z.infer<typeof locationSchema>;

/**
 * Location creation schema (without id and timestamps)
 */
export const locationCreateSchema = locationSchema.omit({
	id: true,
	organization_id: true,
	created_at: true,
	updated_at: true
});

export type LocationCreate = z.infer<typeof locationCreateSchema>;

export const locationDisplaySchema = locationSchema.omit({
	geocode_raw: true,
	geocode_confidence: true,
	geocode_provider: true,
	geocode_place_id: true,
	address_hash: true
});
