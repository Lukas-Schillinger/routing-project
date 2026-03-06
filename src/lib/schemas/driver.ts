import { z } from 'zod';
import { notesSchema, phoneSchema } from './common';

/**
 * Driver schema - represents a driver in the system
 */
export const driverSchema = z.object({
	id: z.uuid(),
	organization_id: z.uuid(),
	name: z
		.string()
		.min(1, 'Name is required')
		.max(200, 'Name must be 200 characters or less'),
	phone: phoneSchema.nullable(),
	notes: notesSchema,
	active: z.boolean(),
	temporary: z.boolean(),
	color: z.string().regex(/^#[0-9A-F]{6}$/i),
	created_at: z.date(),
	created_by: z.uuid().nullable(),
	updated_at: z.date(),
	updated_by: z.uuid().nullable()
});

/**
 * Type inferred from the driver schema
 */
export type Driver = z.infer<typeof driverSchema>;

/**
 * Driver creation schema (without id and timestamps)
 */
export const driverCreateSchema = driverSchema
	.omit({
		id: true,
		organization_id: true,
		created_at: true,
		created_by: true,
		updated_at: true,
		updated_by: true
	})
	.extend({
		// Make phone and notes explicitly optional for creation
		phone: phoneSchema.optional(),
		notes: notesSchema,
		// Provide defaults for boolean fields
		active: z.boolean().default(true),
		temporary: z.boolean().default(false)
	});

export type DriverCreate = z.infer<typeof driverCreateSchema>;

/**
 * Driver update schema - all fields optional except must have some field
 */
export const driverUpdateSchema = z
	.object({
		name: z.string().min(1, 'Name cannot be empty').max(200).optional(),
		phone: phoneSchema.optional(),
		notes: notesSchema,
		active: z.boolean().optional(),
		temporary: z.boolean().optional(),
		color: z
			.string()
			.regex(/^#[0-9A-F]{6}$/i)
			.optional()
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

export type DriverUpdate = z.infer<typeof driverUpdateSchema>;

/**
 * Minimal driver for display (name and contact info)
 */
export const driverDisplaySchema = z.object({
	id: z.uuid(),
	name: z.string(),
	phone: z.string().nullable(),
	active: z.boolean(),
	temporary: z.boolean()
});

export type DriverDisplay = z.infer<typeof driverDisplaySchema>;

/**
 * Driver with route count for list views
 */
export const driverWithRouteCountSchema = driverDisplaySchema.extend({
	routeCount: z.number().int().nonnegative()
});

export type DriverWithRouteCount = z.infer<typeof driverWithRouteCountSchema>;
