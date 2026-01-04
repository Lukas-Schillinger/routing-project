import { z } from 'zod';

// Mail record type enum
export const mailRecordTypeEnum = z.enum(['invitation', 'login_token', 'route_share']);
export type MailRecordType = z.infer<typeof mailRecordTypeEnum>;

// Mail record status enum
export const mailRecordStatusEnum = z.enum([
	'sent',
	'delivered',
	'bounced',
	'complained',
	'delivery_delayed',
	'failed'
]);
export type MailRecordStatus = z.infer<typeof mailRecordStatusEnum>;

// Mail record schema
export const mailRecordSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	created_at: z.date(),
	resend_id: z.string(),
	type: mailRecordTypeEnum,
	to_email: z.string().email(),
	from_email: z.string().email(),
	subject: z.string().nullable(),
	status: mailRecordStatusEnum,
	delivered_at: z.date().nullable(),
	bounced_at: z.date().nullable()
});
export type MailRecord = z.infer<typeof mailRecordSchema>;

// Create mail record input
export const createMailRecordSchema = z.object({
	organization_id: z.string().uuid(),
	resend_id: z.string(),
	type: mailRecordTypeEnum,
	to_email: z.string().email(),
	from_email: z.string().email(),
	subject: z.string().optional()
});
export type CreateMailRecord = z.infer<typeof createMailRecordSchema>;

// Resend webhook event types
export const resendWebhookEventTypeEnum = z.enum([
	'email.sent',
	'email.delivered',
	'email.bounced',
	'email.complained',
	'email.delivery_delayed',
	'email.failed'
]);
export type ResendWebhookEventType = z.infer<typeof resendWebhookEventTypeEnum>;

// Resend webhook data schema
export const resendWebhookDataSchema = z
	.object({
		email_id: z.string(),
		from: z.string(),
		to: z.array(z.string().email()),
		subject: z.string().optional(),
		created_at: z.string(),
		// Bounce-specific fields
		bounce: z
			.object({
				type: z.string()
			})
			.optional(),
		// Fail-specific fields
		failed: z
			.object({
				reason: z.string()
			})
			.optional()
	})
	.passthrough();
export type ResendWebhookData = z.infer<typeof resendWebhookDataSchema>;

// Resend webhook payload schema
export const resendWebhookPayloadSchema = z.object({
	type: resendWebhookEventTypeEnum,
	created_at: z.string(),
	data: resendWebhookDataSchema
});
export type ResendWebhookPayload = z.infer<typeof resendWebhookPayloadSchema>;
