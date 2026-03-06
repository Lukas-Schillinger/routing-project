import { z } from 'zod';
import { notesSchema } from './common';
import { createMaplessStopSchema } from './stop';

export { createMaplessStopSchema };

/**
 * Map creation schema
 */
export const createMapSchema = z.object({
	title: z
		.string()
		.min(1, 'Title is required')
		.max(200, 'Title must be 200 characters or less'),
	notes: notesSchema,
	depot_id: z.uuid().nullish(),
	stops: z.array(createMaplessStopSchema).nullish() // optionally create stops in the same call as the map
});

/**
 * Map update schema
 */
export const updateMapSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	notes: notesSchema,
	depot_id: z.uuid().nullish()
});

/**
 * Complete map schema
 */
export const mapSchema = z.object({
	id: z.uuid(),
	organization_id: z.uuid(),
	title: z.string(),
	notes: notesSchema,
	depot_id: z.uuid().nullable(),
	created_at: z.date(),
	created_by: z.uuid().nullable(),
	updated_at: z.date(),
	updated_by: z.uuid().nullable()
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

/**
 * Optimization options schema - used by client API, server route, and optimization service
 * depotId is optional and falls back to the map's depot_id
 */
export const optimizationOptionsSchema = z.object({
	depotId: z.uuid().optional(),
	fairness: z.enum(['high', 'medium', 'low']).default('medium')
});

/**
 * Job status enum - used for optimization job state machine
 */
export const jobStatusEnum = z.enum([
	'pending',
	'running',
	'completing',
	'completed',
	'failed',
	'cancelled'
]);

/**
 * Optimization job schema - represents a queued/running optimization job
 */
export const optimizationJobSchema = z.object({
	id: z.uuid(),
	organization_id: z.uuid(),
	status: jobStatusEnum,
	matrix_id: z.uuid(),
	map_id: z.uuid(),
	depot_id: z.uuid(),
	error_message: z.string().nullable(),
	created_at: z.coerce.date(),
	created_by: z.uuid().nullable(),
	updated_at: z.coerce.date(),
	updated_by: z.uuid().nullable()
});

// Type exports
export type CreateMap = z.infer<typeof createMapSchema>;
export type UpdateMap = z.infer<typeof updateMapSchema>;
export type Map = z.infer<typeof mapSchema>;
export type MapWithStats = z.infer<typeof mapWithStatsSchema>;
export type OptimizationOptions = z.infer<typeof optimizationOptionsSchema>;
export type JobStatus = z.infer<typeof jobStatusEnum>;
export type OptimizationJob = z.infer<typeof optimizationJobSchema>;
