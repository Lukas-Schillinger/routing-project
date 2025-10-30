import { z } from 'zod';

/**
 * Map creation schema
 */
export const createMapSchema = z.object({
	title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
	description: z.string().max(1000).nullable().optional()
});

/**
 * Map update schema
 */
export const updateMapSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).nullable().optional()
});

/**
 * Map filter schema
 */
export const mapFilterSchema = z.object({
	organization_id: z.string().uuid().optional()
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
export type MapFilter = z.infer<typeof mapFilterSchema>;
export type Map = z.infer<typeof mapSchema>;
export type MapWithStats = z.infer<typeof mapWithStatsSchema>;
