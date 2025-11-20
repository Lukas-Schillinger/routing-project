import { z } from 'zod';
import { locationCreateSchema } from './location';

/** Ugly hack because schemas with `.refine()` don't support `.omit()`.
 * This schema exists so that maps and stops can be created in one API call.
 */
export const createMaplessStopSchema = z
	.object({
		location_id: z.string().uuid().optional(),
		location: locationCreateSchema.optional(),
		driver_id: z.string().uuid().nullable().optional(),
		delivery_index: z.number().int().nullable().optional(),
		contact_name: z.string().max(200).nullable().optional(),
		contact_phone: z.string().max(32).nullable().optional(),
		notes: z.string().nullable().optional()
	})
	.refine((data) => data.location_id || data.location, {
		message: 'Either location_id or location data must be provided',
		path: ['location_id']
	});

/**
 * Map creation schema
 */
export const createMapSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
	description: z.string().max(1000).nullable().optional(),
	stops: z.array(createMaplessStopSchema).optional().nullable() // optionally create stops in the same call as the map
});

/**
 * Map update schema
 */
export const updateMapSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).nullable().optional()
});

/**
 * Complete map schema
 */
export const mapSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	title: z.string(),
	created_at: z.date(),
	updated_at: z.date()
});

/**
 * Map with statistics
 */
export const mapWithStatsSchema = mapSchema.extend({
	stats: z.object({
		stops: z.number(),
		drivers: z.number(),
		optimized: z.boolean()
	})
});

// Type exports
export type CreateMap = z.infer<typeof createMapSchema>;
export type UpdateMap = z.infer<typeof updateMapSchema>;
export type Map = z.infer<typeof mapSchema>;
export type MapWithStats = z.infer<typeof mapWithStatsSchema>;
