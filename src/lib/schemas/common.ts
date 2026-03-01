import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

// Common field schemas that can be reused
export const emailSchema = z
	.string()
	.min(3, 'Email must be at least 3 characters')
	.max(255, 'Email must be less than 255 characters')
	.email('Please enter a valid email address')
	.refine(
		(email) => !email.includes('..'),
		'Email cannot contain consecutive dots'
	)
	.refine((email) => !/\s/.test(email), 'Email cannot contain spaces');

export const passwordSchema = z
	.string()
	.min(6, 'Password must be at least 6 characters')
	.max(255, 'Password must be less than 255 characters');

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const timestampSchema = z.date();

export const nameSchema = z
	.string()
	.min(1, 'Name is required')
	.max(200, 'Name must be less than 200 characters')
	.trim();

/**
 * Validates and formats US phone numbers using libphonenumber-js.
 * Accepts various formats and normalizes to E.164 format.
 */
export const phoneSchema = z
	.string()
	.max(32, 'Phone number must be less than 32 characters')
	.refine(
		(val) => {
			if (!val || val.trim() === '') return true;
			return isValidPhoneNumber(val, 'US');
		},
		{ message: 'Please enter a valid US phone number' }
	)
	.transform((val) => {
		if (!val || val.trim() === '') return null;
		try {
			const parsed = parsePhoneNumber(val, 'US');
			return parsed.format('E.164');
		} catch {
			return val;
		}
	})
	.nullable();

export const notesSchema = z
	.string()
	.max(1000, 'Notes must be less than 1000 characters')
	.transform((val) => (val?.trim() === '' ? null : val))
	.nullable();

// GeoJSON schemas
export const coordinateSchema = z.tuple([z.number(), z.number()]); // [longitude, latitude]

export const geoJsonLineStringSchema = z.object({
	type: z.literal('LineString'),
	coordinates: z.array(coordinateSchema)
});

export type GeoJsonLineString = z.infer<typeof geoJsonLineStringSchema>;
