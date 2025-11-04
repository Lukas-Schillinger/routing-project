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

// Type exports for convenience
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
