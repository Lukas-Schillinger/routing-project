import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';
import { roleEnum } from './user.js';

// Authentication input schemas
export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema
});

export const registerSchema = z
	.object({
		email: emailSchema,
		password: passwordSchema,
		passwordConfirm: passwordSchema
	})
	.refine((data) => data.password === data.passwordConfirm, {
		message: "Passwords don't match",
		path: ['passwordConfirm']
	});

export const createMagicInviteSchema = z.object({
	type: z.literal('invite'),
	email: z.string().email(),
	role: roleEnum,
	token_duration_hours: z.number().default(720),
	invitee_organization_id: z.string().nullable().optional()
});

export const createMagicLoginSchema = z.object({
	type: z.literal('login').default('login').optional(),
	email: emailSchema,
	token_duration_hours: z.number().default(720).optional()
});

export const verifyOTPSchema = z.object({
	email: emailSchema,
	code: z.string().length(6)
});

export const magicLinkSchema = z.object({
	id: z.string(),
	organization_id: z.string(),
	updated_at: z.date(),
	updated_by: z.string().nullable(),
	created_by: z.string().nullable(),
	created_at: z.date(),

	expires_at: z.date(),
	type: z.enum(['login', 'invite']),

	invitee_organization_id: z.string().nullable(),
	email: z.string().email(),

	user_id: z.string().nullable(),

	used_at: z.date().nullable(),
	token_hash: z.string(),
	mail_record_id: z.string().nullable()
});

export const magicInviteSchema = magicLinkSchema.extend({
	type: z.literal('invite'),
	user_id: z.null(),
	role: roleEnum
});

export const magicLoginSchema = magicLinkSchema.extend({
	type: z.literal('login'),
	user_id: z.string()
});

// Type exports for convenience
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export type CreateMagicLogin = z.infer<typeof createMagicLoginSchema>;
export type CreateMagicInvite = z.infer<typeof createMagicInviteSchema>;
export type VerifyOTP = z.infer<typeof verifyOTPSchema>;
export type MagicInvite = z.infer<typeof magicInviteSchema>;
export type MagicLogin = z.infer<typeof magicLoginSchema>;
export type MagicLink = z.infer<typeof magicLinkSchema>;
