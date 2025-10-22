import { z } from 'zod';
import { timestampSchema, uuidSchema } from './common.js';

/**
 * Route stop schema - represents a stop assignment to a route with sequence
 */
export const routeStopSchema = z.object({
	id: uuidSchema,
	organization_id: uuidSchema,
	route_id: uuidSchema,
	stop_id: uuidSchema,
	sequence: z.number().int().positive(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

/**
 * Type inferred from the route stop schema
 */
export type RouteStop = z.infer<typeof routeStopSchema>;

/**
 * Route stop creation schema (without id and timestamps)
 */
export const routeStopCreateSchema = routeStopSchema.omit({
	id: true,
	created_at: true,
	updated_at: true
});

export type RouteStopCreate = z.infer<typeof routeStopCreateSchema>;

/**
 * Route stop update schema
 */
export const routeStopUpdateSchema = z.object({
	sequence: z.number().int().positive().optional()
});

export type RouteStopUpdate = z.infer<typeof routeStopUpdateSchema>;
