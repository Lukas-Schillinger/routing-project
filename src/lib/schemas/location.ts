import { z } from 'zod';

/**
 * Location schema - represents a geocoded physical address
 */
export const locationSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	name: z.string().max(200).nullable(),
	address_line1: z.string().max(240),
	address_line2: z.string().max(240).nullable(),
	city: z.string().max(120).nullable(),
	region: z.string().max(120).nullable(),
	postal_code: z.string().max(40).nullable(),
	country: z.string().max(2).nullable(),
	lat: z.string().nullable(),
	lon: z.string().nullable(),
	address_hash: z.string().max(64).nullable(),
	geocode_confidence: z.string().nullable(),
	geocode_source: z.string().max(32).nullable(),
	created_at: z.date(),
	updated_at: z.date()
});

/**
 * Type inferred from the location schema
 */
export type Location = z.infer<typeof locationSchema>;

/**
 * Partial location for updates
 */
export const locationUpdateSchema = locationSchema.partial().required({ id: true });

export type LocationUpdate = z.infer<typeof locationUpdateSchema>;

/**
 * Location creation schema (without id and timestamps)
 */
export const locationCreateSchema = locationSchema.omit({
	id: true,
	created_at: true,
	updated_at: true
});

export type LocationCreate = z.infer<typeof locationCreateSchema>;

/**
 * Minimal location for display (coordinates and address)
 */
export const locationDisplaySchema = z.object({
	id: z.string().uuid(),
	name: z.string().nullable(),
	address_line1: z.string(),
	city: z.string().nullable(),
	region: z.string().nullable(),
	postal_code: z.string().nullable(),
	lat: z.string().nullable(),
	lon: z.string().nullable(),
	geocode_confidence: z.string().nullable()
});

export type LocationDisplay = z.infer<typeof locationDisplaySchema>;
