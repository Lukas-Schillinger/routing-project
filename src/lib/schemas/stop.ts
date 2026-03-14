import { z } from 'zod';
import { BULK_LIMITS } from '$lib/config/constants';
import { notesSchema, phoneSchema } from './common';
import type { Location } from './location';
import { locationCreateSchema } from './location';

const stopOptionalFields = {
	driver_id: z.uuid().nullish(),
	delivery_index: z.number().int().nullish(),
	contact_name: z.string().max(200).nullish(),
	contact_phone: phoneSchema.optional(),
	notes: notesSchema
};

const locationFields = {
	location_id: z.uuid().optional(),
	location: locationCreateSchema.optional()
};

const locationRefine = {
	message: 'Either location_id or location data must be provided',
	path: ['location_id'] as PropertyKey[]
};

// Stop without map_id — used for bulk creation and inline map+stops creation
export const createMaplessStopSchema = z
	.object({ ...locationFields, ...stopOptionalFields })
	.refine((data) => data.location_id || data.location, locationRefine);

export const createStopSchema = z
	.object({ map_id: z.uuid(), ...locationFields, ...stopOptionalFields })
	.refine((data) => data.location_id || data.location, locationRefine);

export const bulkCreateStopsSchema = z
	.array(createMaplessStopSchema)
	.min(1)
	.max(BULK_LIMITS.MAX_STOPS);

export const updateStopSchema = z.object({
	...locationFields,
	...stopOptionalFields
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
	notes: notesSchema,
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
