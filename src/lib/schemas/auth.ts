import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';

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

const createMagicLinkSchema = z.object({
	expires_at: z.date(),
	type: z.enum(['invite', 'login']),

	invitee_organization_id: z.string().nullable().optional(),
	email: z.string().email().nullable().optional(),
	// role: z.string().optional().nullable(),

	user_id: z.string().nullable().optional(),

	token_hash: z.string()
});

export const createMagicInviteSchema = createMagicLinkSchema.extend({
	type: z.literal('invite'),
	invitee_organization_id: z.string(),
	email: z.string().email()
});

export const createMagicLoginSchema = createMagicLinkSchema.extend({
	type: z.literal('login'),
	user_id: z.string()
});

export const magicInviteSchema = createMagicInviteSchema.extend({
	id: z.string(),
	organization_id: z.string(),
	updated_at: z.date(),
	created_at: z.date()
});

export const magicLoginSchema = createMagicLoginSchema.extend({
	id: z.string(),
	organization_id: z.string(),
	updated_at: z.date(),
	created_at: z.date()
});

export const magicLinkSchema = createMagicLinkSchema.extend({
	id: z.string(),
	organization_id: z.string(),
	updated_at: z.date(),
	created_at: z.date()
});

// Type exports for convenience
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export type CreateMagicLogin = z.infer<typeof createMagicLoginSchema>;
export type CreateMagicInvite = z.infer<typeof createMagicInviteSchema>;
export type MagicInvite = z.infer<typeof magicInviteSchema>;
export type MagicLogin = z.infer<typeof magicLoginSchema>;
export type MagicLink = z.infer<typeof magicLinkSchema>;
