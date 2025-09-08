import { z } from 'zod';

// Auth validation schemas
export const emailSchema = z
	.string()
	.min(3, 'Email must be at least 3 characters')
	.max(255, 'Email must be less than 255 characters')
	.email('Please enter a valid email address')
	.refine((email) => !email.includes('..'), 'Email cannot contain consecutive dots')
	.refine((email) => !/\s/.test(email), 'Email cannot contain spaces');

export const passwordSchema = z
	.string()
	.min(6, 'Password must be at least 6 characters')
	.max(255, 'Password must be less than 255 characters');

// Combined auth schemas
export const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema
});

export const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema
});

// Legacy functions for backward compatibility
export function validateEmail(email: unknown): email is string {
	try {
		emailSchema.parse(email);
		return true;
	} catch {
		return false;
	}
}

export function validatePassword(password: unknown): password is string {
	try {
		passwordSchema.parse(password);
		return true;
	} catch {
		return false;
	}
}

// New Zod-based validation functions
export function validateAuthInput(data: { email: unknown; password: unknown }) {
	return loginSchema.safeParse(data);
}

export function validateRegistrationInput(data: { email: unknown; password: unknown }) {
	return registerSchema.safeParse(data);
}
