import { z } from 'zod';
import { emailSchema } from './common';
import { mailRecordSchema } from './mail-record';

// Share type enum
export const routeShareTypeEnum = z.enum(['email', 'sms']);
export type RouteShareType = z.infer<typeof routeShareTypeEnum>;

// Route share schema
export const routeShareSchema = z.object({
	id: z.uuid(),
	organization_id: z.uuid(),
	route_id: z.uuid(),
	created_by: z.uuid().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
	share_type: routeShareTypeEnum,
	access_token_hash: z.string(),
	expires_at: z.date(),
	revoked_at: z.date().nullable(),
	mail_record_id: z.uuid().nullable()
});
export type RouteShare = z.infer<typeof routeShareSchema>;

// Create route share input (for email shares)
export const createEmailShareSchema = z.object({
	route_id: z.uuid(),
	recipient_email: emailSchema
});
export type CreateEmailShare = z.infer<typeof createEmailShareSchema>;

// Route share with mail record for display
export const routeShareWithMailRecordSchema = routeShareSchema.extend({
	mailRecord: mailRecordSchema.nullable()
});
export type RouteShareWithMailRecord = z.infer<
	typeof routeShareWithMailRecordSchema
>;
