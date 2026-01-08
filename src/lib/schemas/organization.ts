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
	updated_by: uuidSchema.nullable()
});

// Type exports
export type CreateOrganization = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganization = z.infer<typeof updateOrganizationSchema>;
export type Organization = z.infer<typeof organizationSchema>;
