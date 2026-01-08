import { z } from 'zod';
import { emailSchema, timestampSchema, uuidSchema } from './common.js';

// Role enum - used across user schemas
export const roleEnum = z.enum(['admin', 'member', 'viewer', 'driver']);
export type Role = z.infer<typeof roleEnum>;

// User creation schema
export const createUserSchema = z.object({
	name: z.string().max(200).nullish(),
	email: emailSchema,
	passwordHash: z.string().min(1, 'Password hash is required').nullish(),
	organization_id: uuidSchema.nullish(),
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

// Full user schema (what comes from DB)
export const userSchema = z.object({
	id: uuidSchema,
	organization_id: uuidSchema,

	created_at: timestampSchema,
	created_by: uuidSchema.nullable(),
	updated_at: timestampSchema,
	updated_by: uuidSchema.nullable(),

	name: z.string().max(200).nullable(),
	email: emailSchema,
	passwordHash: z.string().nullable(),
	role: roleEnum,
	email_confirmed_at: timestampSchema.nullable()
});

// Public user schema (without sensitive data)
export const publicUserSchema = userSchema.omit({ passwordHash: true });

// Type exports
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>;
export type User = z.infer<typeof userSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
