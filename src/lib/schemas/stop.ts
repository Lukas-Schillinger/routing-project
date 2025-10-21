import { z } from 'zod';
import { locationDisplaySchema } from './location.js';

/**
 * Stop schema - represents a delivery/service stop on a map
 */
export const stopSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	map_id: z.string().uuid(),
	location_id: z.string().uuid(),
	external_ref: z.string().max(120).nullable(),
	contact_name: z.string().max(200).nullable(),
	contact_phone: z.string().max(32).nullable(),
	notes: z.string().nullable(),
	created_at: z.date(),
	updated_at: z.date()
});

/**
 * Type inferred from the stop schema
 */
export type Stop = z.infer<typeof stopSchema>;

/**
 * Partial stop for updates
 */
export const stopUpdateSchema = stopSchema.partial().required({ id: true });

export type StopUpdate = z.infer<typeof stopUpdateSchema>;

/**
 * Stop creation schema (without id and timestamps)
 */
export const stopCreateSchema = stopSchema.omit({
	id: true,
	created_at: true,
	updated_at: true
});

export type StopCreate = z.infer<typeof stopCreateSchema>;

/**
 * Stop with location details (for display)
 */
export const stopWithLocationSchema = z.object({
	stop: stopSchema,
	location: locationDisplaySchema
});

export type StopWithLocation = z.infer<typeof stopWithLocationSchema>;

/**
 * Minimal stop for display
 */
export const stopDisplaySchema = z.object({
	id: z.string().uuid(),
	contact_name: z.string().nullable(),
	contact_phone: z.string().nullable(),
	notes: z.string().nullable()
});

export type StopDisplay = z.infer<typeof stopDisplaySchema>;
