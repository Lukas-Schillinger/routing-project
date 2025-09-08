import { z } from 'zod';
import { nameSchema, notesSchema, timestampSchema, uuidSchema } from './common.js';

// Route creation schema
export const createRouteSchema = z.object({
	name: nameSchema,
	organization_id: uuidSchema,
	map_id: uuidSchema,
	driver_id: uuidSchema.optional(),
	optimized: z.boolean().default(false),
	completed: z.boolean().default(false),
	notes: notesSchema
});

// Route update schema
export const updateRouteSchema = z.object({
	name: nameSchema.optional(),
	driver_id: uuidSchema.optional().nullable(),
	optimized: z.boolean().optional(),
	completed: z.boolean().optional(),
	notes: notesSchema.optional()
});

// Route query/filter schema
export const routeFilterSchema = z.object({
	organization_id: uuidSchema.optional(),
	map_id: uuidSchema.optional(),
	driver_id: uuidSchema.optional(),
	optimized: z.boolean().optional(),
	completed: z.boolean().optional(),
	search: z.string().optional()
});

// Full route schema
export const routeSchema = z.object({
	id: uuidSchema,
	organization_id: uuidSchema,
	map_id: uuidSchema,
	driver_id: uuidSchema.nullable(),
	name: nameSchema,
	optimized: z.boolean(),
	completed: z.boolean(),
	notes: z.string().nullable(),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

// Type exports
export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type RouteFilter = z.infer<typeof routeFilterSchema>;
export type Route = z.infer<typeof routeSchema>;
