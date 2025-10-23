import { z } from 'zod';
import type { Location } from './location';

export const createStopSchema = z.object({
	map_id: z.string().uuid(),
	location_id: z.string().uuid(),
	driver_id: z.string().uuid().nullable().optional(),
	delivery_index: z.number().int().nullable().optional(),
	contact_name: z.string().max(200).nullable().optional(),
	contact_phone: z.string().max(32).nullable().optional(),
	notes: z.string().nullable().optional()
});

export const updateStopSchema = z.object({
	location_id: z.string().uuid().optional(),
	driver_id: z.string().uuid().nullable().optional(),
	delivery_index: z.number().int().nullable().optional(),
	contact_name: z.string().max(200).nullable().optional(),
	contact_phone: z.string().max(32).nullable().optional(),
	notes: z.string().nullable().optional()
});

export const stopFilterSchema = z.object({
	map_id: z.string().uuid().optional(),
	driver_id: z.string().uuid().optional(),
	organization_id: z.string().uuid().optional()
});

export const stopSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	map_id: z.string().uuid(),
	location_id: z.string().uuid(),
	driver_id: z.string().uuid().nullable(),
	delivery_index: z.number().int().nullable(),
	contact_name: z.string().nullable(),
	contact_phone: z.string().nullable(),
	notes: z.string().nullable(),
	created_at: z.date(),
	updated_at: z.date()
});

export type CreateStop = z.infer<typeof createStopSchema>;
export type UpdateStop = z.infer<typeof updateStopSchema>;
export type StopFilter = z.infer<typeof stopFilterSchema>;
export type Stop = z.infer<typeof stopSchema>;

export type StopWithLocation = {
	stop: Stop;
	location: Location;
};
