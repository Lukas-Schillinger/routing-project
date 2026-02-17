import { z } from 'zod';
import { BULK_LIMITS } from '$lib/config';
import { phoneSchema } from './common';
import type { Location } from './location';
import { locationCreateSchema } from './location';

export const createStopSchema = z
	.object({
		map_id: z.uuid(),
		location_id: z.uuid().optional(),
		location: locationCreateSchema.optional(),
		driver_id: z.uuid().nullable().optional(),
		delivery_index: z.number().int().nullable().optional(),
		contact_name: z.string().max(200).nullable().optional(),
		contact_phone: phoneSchema.optional(),
		notes: z.string().nullable().optional()
	})
	.refine((data) => data.location_id || data.location, {
		message: 'Either location_id or location data must be provided',
		path: ['location_id']
	});

// Schema for bulk creating stops (map_id comes from URL param)
export const bulkCreateStopsSchema = z
	.array(
		z
			.object({
				location_id: z.uuid().optional(),
				location: locationCreateSchema.optional(),
				driver_id: z.uuid().nullable().optional(),
				delivery_index: z.number().int().nullable().optional(),
				contact_name: z.string().max(200).nullable().optional(),
				contact_phone: phoneSchema.optional(),
				notes: z.string().nullable().optional()
			})
			.refine((data) => data.location_id || data.location, {
				message: 'Either location_id or location data must be provided',
				path: ['location_id']
			})
	)
	.min(1)
	.max(BULK_LIMITS.MAX_STOPS);

export const updateStopSchema = z.object({
	location_id: z.uuid().optional(),
	location: locationCreateSchema.optional(),
	driver_id: z.uuid().nullable().optional(),
	delivery_index: z.number().int().nullable().optional(),
	contact_name: z.string().max(200).nullable().optional(),
	contact_phone: phoneSchema.optional(),
	notes: z.string().nullable().optional()
});

export const stopSchema = z.object({
	id: z.uuid(),
	organization_id: z.uuid(),
	map_id: z.uuid(),
	location_id: z.uuid(),
	driver_id: z.uuid().nullable(),
	delivery_index: z.number().int().nullable(),
	contact_name: z.string().nullable(),
	contact_phone: phoneSchema,
	notes: z.string().nullable(),
	created_at: z.date(),
	created_by: z.uuid().nullable(),
	updated_at: z.date(),
	updated_by: z.uuid().nullable()
});

export const reorderStopsSchema = z.object({
	updates: z.array(
		z.object({
			stop_id: z.uuid(),
			driver_id: z.uuid().nullable(),
			delivery_index: z.number().int().nullable()
		})
	)
});

export type CreateStop = z.infer<typeof createStopSchema>;
export type BulkCreateStops = z.infer<typeof bulkCreateStopsSchema>;
export type UpdateStop = z.infer<typeof updateStopSchema>;
export type Stop = z.infer<typeof stopSchema>;
export type ReorderStops = z.infer<typeof reorderStopsSchema>;

export type StopWithLocation = {
	stop: Stop;
	location: Location;
};
