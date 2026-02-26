import { TOKEN_EXPIRY } from '$lib/config';
import { z } from 'zod';
import { emailSchema, passwordSchema } from './common.js';
import { roleEnum } from './user.js';

// Authentication input schemas
export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema
});

export const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema
});

export const createInvitationSchema = z.object({
	email: emailSchema,
	role: roleEnum
});

export const loginTokenTypeEnum = z.enum(['login_token', 'password_reset']);
export type LoginTokenType = z.infer<typeof loginTokenTypeEnum>;

export const createLoginTokenSchema = z.object({
	email: emailSchema,
	type: loginTokenTypeEnum.optional().default('login_token'),
	token_duration_hours: z.number().optional().default(TOKEN_EXPIRY.OTP_HOURS)
});

export const verifyOTPSchema = z.object({
	email: emailSchema,
	code: z.string().length(6)
});

export const requestPasswordResetSchema = z.object({
	email: emailSchema
});

export const resetPasswordSchema = z.object({
	email: emailSchema,
	token: z.string().min(1),
	newPassword: z.string().min(6).max(255)
});

export const invitationSchema = z.object({
	id: z.string(),
	organization_id: z.string(),
	created_at: z.date(),
	created_by: z.string().nullable(),
	updated_at: z.date(),
	updated_by: z.string().nullable(),

	email: emailSchema,
	role: roleEnum,
	token_hash: z.string(),
	expires_at: z.date(),
	used_at: z.date().nullable(),
	mail_record_id: z.string().nullable()
});

export const loginTokenSchema = z.object({
	id: z.string(),
	organization_id: z.string(),
	created_at: z.date(),

	user_id: z.string(),
	token_hash: z.string(),
	type: loginTokenTypeEnum,
	expires_at: z.date(),
	mail_record_id: z.string().nullable()
});

// Type exports for convenience
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export type CreateInvitation = z.infer<typeof createInvitationSchema>;
export type CreateLoginToken = z.input<typeof createLoginTokenSchema>;
export type VerifyOTP = z.infer<typeof verifyOTPSchema>;
export type RequestPasswordReset = z.infer<typeof requestPasswordResetSchema>;
export type ResetPassword = z.infer<typeof resetPasswordSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type LoginToken = z.infer<typeof loginTokenSchema>;
