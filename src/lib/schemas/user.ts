import { z } from 'zod';
import { emailSchema, timestampSchema, uuidSchema } from './common.js';

// User creation schema
export const createUserSchema = z.object({
	email: emailSchema,
	passwordHash: z.string().min(1, 'Password hash is required'),
	organization_id: uuidSchema.optional(),
	role: z.enum(['admin', 'member', 'viewer']).default('member')
});

// User update schema
export const updateUserSchema = z.object({
	email: emailSchema.optional(),
	role: z.enum(['admin', 'member', 'viewer']).optional()
});

// User query/filter schema
export const userFilterSchema = z.object({
	organization_id: uuidSchema.optional(),
	role: z.enum(['admin', 'member', 'viewer']).optional(),
	search: z.string().optional()
});

// Full user schema (what comes from DB)
export const userSchema = z.object({
	id: uuidSchema,
	organization_id: uuidSchema.nullable(),
	email: emailSchema,
	passwordHash: z.string(),
	role: z.enum(['admin', 'member', 'viewer']),
	created_at: timestampSchema,
	updated_at: timestampSchema
});

// Public user schema (without sensitive data)
export const publicUserSchema = userSchema.omit({ passwordHash: true });

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserFilter = z.infer<typeof userFilterSchema>;
export type User = z.infer<typeof userSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
