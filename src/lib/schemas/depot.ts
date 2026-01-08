import { z } from 'zod';
import { locationCreateSchema, locationSchema } from './location';

/**
 * Depot schema - represents a depot/warehouse location in the system
 */
export const depotSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	location_id: z.string().uuid(),
	name: z
		.string()
		.min(1, 'Name is required')
		.max(200, 'Name must be 200 characters or less'),
	default_depot: z.boolean(),
	created_at: z.date(),
	updated_at: z.date()
});

/**
 * Type inferred from the depot schema
 */
export type Depot = z.infer<typeof depotSchema>;

/**
 * Depot creation schema (without id and timestamps)
 * Supports both location_id (existing location) and location data (new location)
 */
export const depotCreateSchema = z
	.object({
		name: z
			.string()
			.min(1, 'Name is required')
			.max(200, 'Name must be 200 characters or less'),
		default_depot: z.boolean().default(false),
		// Either reference an existing location
		location_id: z.string().uuid().optional(),
		// Or provide data to create a new location
		location: locationCreateSchema.optional()
	})
	.refine((data) => data.location_id || data.location, {
		message: 'Either location_id or location data must be provided'
	});

export type DepotCreate = z.infer<typeof depotCreateSchema>;

/**
 * Depot update schema - all fields optional except must have some field
 */
export const depotUpdateSchema = z
	.object({
		location_id: z.string().uuid().optional(),
		location: locationCreateSchema.optional(),
		name: z.string().min(1, 'Name cannot be empty').max(200).optional(),
		default_depot: z.boolean().optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

export type DepotUpdate = z.infer<typeof depotUpdateSchema>;

/**
 * Depot with location details - nested structure from joins
 * This matches the structure returned by Drizzle joins
 */
export const depotWithLocationJoinSchema = z.object({
	depot: depotSchema,
	location: locationSchema
});

export type DepotWithLocationJoin = z.infer<typeof depotWithLocationJoinSchema>;
