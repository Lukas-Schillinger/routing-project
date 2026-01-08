import { z } from 'zod';
import { mailRecordSchema } from './mail-record';

// Share type enum
export const routeShareTypeEnum = z.enum(['email', 'sms']);
export type RouteShareType = z.infer<typeof routeShareTypeEnum>;

// Route share schema
export const routeShareSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	route_id: z.string().uuid(),
	created_by: z.string().uuid().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
	share_type: routeShareTypeEnum,
	access_token_hash: z.string(),
	expires_at: z.date(),
	revoked_at: z.date().nullable(),
	mail_record_id: z.string().uuid().nullable()
});
export type RouteShare = z.infer<typeof routeShareSchema>;

// Create route share input (for email shares)
export const createEmailShareSchema = z.object({
	route_id: z.string().uuid(),
	recipient_email: z.string().email('Valid email is required')
});
export type CreateEmailShare = z.infer<typeof createEmailShareSchema>;

// Route share with mail record for display
export const routeShareWithMailRecordSchema = routeShareSchema.extend({
	mailRecord: mailRecordSchema.nullable()
});
export type RouteShareWithMailRecord = z.infer<
	typeof routeShareWithMailRecordSchema
>;
