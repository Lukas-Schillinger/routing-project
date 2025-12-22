import { z } from 'zod';
import { emailSchema, timestampSchema, uuidSchema } from './common.js';

// Role enum - used across user schemas
export const roleEnum = z.enum(['admin', 'member', 'viewer', 'driver']);
export type Role = z.infer<typeof roleEnum>;

// User creation schema
export const createUserSchema = z.object({
	name: z.string().max(200).nullish(),
	email: emailSchema,
	passwordHash: z.string().min(1, 'Password hash is required').nullable(),
	organization_id: uuidSchema.optional(),
	role: roleEnum.default('member')
});

// User update schema (self-update)
export const updateUserSchema = z.object({
	name: z.string().max(200).nullish()
});

// Admin update schema (for updating other users)
export const updateUserRoleSchema = z.object({
	role: roleEnum
});

// User query/filter schema
export const userFilterSchema = z.object({
	organization_id: uuidSchema.optional(),
	role: roleEnum.optional(),
	search: z.string().optional()
});

// Full user schema (what comes from DB)
export const userSchema = z.object({
	id: uuidSchema,
	organization_id: uuidSchema,
	name: z.string().max(200).nullable(),
	email: emailSchema,
	passwordHash: z.string().nullable(),
	role: roleEnum,
	created_at: timestampSchema,
	updated_at: timestampSchema
});

// Public user schema (without sensitive data)
export const publicUserSchema = userSchema.omit({ passwordHash: true });

// Type exports
export type CreateUse = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
export type UserFilter = z.infer<typeof userFilterSchema>;
export type User = z.infer<typeof userSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
