import { registerSchema } from '$lib/schemas/auth';
import { emailSchema, passwordSchema } from '$lib/schemas/common';
import { fail, redirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import modules that will be mocked
import { db } from '$lib/server/db';
import * as auth from '$lib/services/server/auth';
import { userService } from '$lib/services/server/user.service.js';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn()
	}
}));

vi.mock('$lib/services/server/auth', () => ({
	generateSessionToken: vi.fn(),
	createSession: vi.fn(),
	setSessionTokenCookie: vi.fn(),
	createUser: vi.fn()
}));

vi.mock('$lib/services/server/user.service.js', () => ({
	userService: {
		createUser: vi.fn()
	}
}));

vi.mock('@sveltejs/kit', () => ({
	fail: vi.fn(),
	redirect: vi.fn()
}));

vi.mock('@node-rs/argon2', () => ({
	hash: vi.fn(),
	verify: vi.fn()
}));

describe('Registration Server Actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('Validation Schemas', () => {
		describe('emailSchema', () => {
			it('should accept valid email formats', () => {
				const validEmails = [
					'test@example.com',
					'user.name@domain.co.uk',
					'test+tag@example.org',
					'123@numbers.com',
					'user-name@sub.domain.com',
					'a@b.co'
				];

				validEmails.forEach((email) => {
					expect(emailSchema.safeParse(email).success).toBe(true);
				});
			});

			it('should reject invalid email formats', () => {
				const invalidEmails = [
					'notanemail',
					'@domain.com',
					'user@',
					'user..name@domain.com',
					'user name@domain.com',
					'',
					'user@domain',
					'user@.com',
					'user@domain.',
					null,
					undefined,
					123
				];

				invalidEmails.forEach((email) => {
					expect(emailSchema.safeParse(email).success).toBe(false);
				});
			});

			it('should reject emails that are too short', () => {
				expect(emailSchema.safeParse('a@').success).toBe(false);
				expect(emailSchema.safeParse('ab').success).toBe(false);
			});

			it('should reject emails that are too long', () => {
				const longEmail = 'a'.repeat(250) + '@example.com';
				expect(emailSchema.safeParse(longEmail).success).toBe(false);
			});
		});

		describe('passwordSchema', () => {
			it('should accept valid password lengths', () => {
				const validPasswords = [
					'123456', // minimum length
					'password123',
					'complex!Password123',
					'a'.repeat(255) // maximum length
				];

				validPasswords.forEach((password) => {
					expect(passwordSchema.safeParse(password).success).toBe(true);
				});
			});

			it('should reject invalid password lengths', () => {
				const invalidPasswords = [
					'', // empty
					'12345', // too short
					'abc', // too short
					'a'.repeat(256), // too long
					null,
					undefined,
					123
				];

				invalidPasswords.forEach((password) => {
					expect(passwordSchema.safeParse(password).success).toBe(false);
				});
			});
		});

		describe('registerSchema', () => {
			it('should validate complete registration input', () => {
				const validInput = {
					email: 'test@example.com',
					password: 'password123',
					passwordConfirm: 'password123'
				};
				expect(registerSchema.safeParse(validInput).success).toBe(true);
			});

			it('should reject invalid registration input', () => {
				const invalidInputs = [
					{
						email: 'invalid',
						password: 'password123',
						passwordConfirm: 'password123'
					},
					{
						email: 'test@example.com',
						password: '123',
						passwordConfirm: '123'
					},
					{ email: '', password: '', passwordConfirm: '' },
					{ email: 'test@example.com', passwordConfirm: 'password123' }, // missing password
					{ password: 'password123', passwordConfirm: 'password123' }, // missing email
					{ email: 'test@example.com', password: 'password123' } // missing contirm password
				];

				invalidInputs.forEach((input) => {
					expect(registerSchema.safeParse(input).success).toBe(false);
				});
			});
		});
	});

	describe('Server Actions', () => {
		describe('Register Action', () => {
			it('should handle successful registration', async () => {
				const { actions } = await import('./+page.server.js');

				// Mock the createUser function
				vi.mocked(userService.createUser).mockResolvedValue({
					id: 'new-user-123',
					email: 'test@example.com',
					passwordHash: null,
					created_at: new Date(),
					created_by: null,
					updated_at: new Date(),
					updated_by: null,
					organization_id: 'org_id',
					name: null,
					role: 'member',
					email_confirmed_at: null
				});

				// Mock auth functions
				vi.mocked(auth.generateSessionToken).mockReturnValue('session-token');
				vi.mocked(auth.createSession).mockResolvedValue({
					id: 'session-123',
					user_id: 'new-user-123',
					expires_at: new Date('2025-01-01')
				});
				vi.mocked(auth.setSessionTokenCookie).mockImplementation(() => {});

				vi.mocked(redirect).mockImplementation(() => {
					throw new Error('redirect');
				});

				const mockEvent = {
					request: {
						formData: vi.fn().mockResolvedValue(
							new Map([
								['email', 'newuser@example.com'],
								['password', 'password123'],
								['password-confirm', 'password123']
							])
						)
					},
					locals: { user: null, session: null }
				};

				await expect(actions.register(mockEvent as never)).rejects.toThrow(
					'redirect'
				);
				expect(redirect).toHaveBeenCalledWith(302, '/auth/account');
			});

			it('should handle registration with invalid email', async () => {
				const { actions } = await import('./+page.server.js');

				vi.mocked(fail).mockReturnValue({ status: 400 } as never);

				const mockEvent = {
					request: {
						formData: vi.fn().mockResolvedValue(
							new Map([
								['email', 'invalid-email'],
								['password', 'password123']
							])
						)
					},
					locals: { user: null, session: null }
				};

				await actions.register(mockEvent as never);
				expect(fail).toHaveBeenCalledWith(400, {
					message: 'Please enter a valid email address'
				});
			});

			it('should handle database error during registration', async () => {
				const { actions } = await import('./+page.server.js');

				// Mock database error
				vi.mocked(db.insert).mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi
							.fn()
							.mockRejectedValue(new Error('Unique constraint violation'))
					})
				} as never);

				vi.mocked(fail).mockReturnValue({ status: 500 } as never);

				const mockEvent = {
					request: {
						formData: vi.fn().mockResolvedValue(
							new Map([
								['email', 'existing@example.com'],
								['password', 'password123'],
								['password-confirm', 'password123']
							])
						)
					},
					locals: { user: null, session: null }
				};

				await actions.register(mockEvent as never);
				expect(fail).toHaveBeenCalledWith(500, {
					message: 'An error has occurred'
				});
			});
		});
	});
});
