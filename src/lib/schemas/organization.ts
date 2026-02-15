import { z } from 'zod';
import { nameSchema, timestampSchema, uuidSchema } from './common.js';

// Organization creation schema
export const createOrganizationSchema = z.object({
	name: nameSchema
});

// Organization update schema
export const updateOrganizationSchema = z.object({
	name: nameSchema.optional()
});

// Full organization schema
export const organizationSchema = z.object({
	id: uuidSchema,
	name: nameSchema,
	created_at: timestampSchema,
	created_by: uuidSchema.nullable(),
	updated_at: timestampSchema,
	updated_by: uuidSchema.nullable(),
	// Billing fields (no subscription = Free tier)
	stripe_customer_id: z.string().nullable(),
	stripe_subscription_id: z.string().nullable(),
	subscription_status: z
		.enum([
			'active',
			'canceled',
			'incomplete',
			'incomplete_expired',
			'past_due',
			'paused',
			'trialing',
			'unpaid'
		])
		.nullable(),
	billing_period_starts_at: timestampSchema.nullable(),
	billing_period_ends_at: timestampSchema.nullable(),
	cancel_at_period_end: z.boolean()
});

// Type exports
export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;
export type Organization = z.infer<typeof organizationSchema>;
