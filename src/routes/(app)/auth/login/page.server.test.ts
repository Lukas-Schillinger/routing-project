import { loginSchema } from '$lib/schemas/auth';
import { emailSchema, passwordSchema } from '$lib/schemas/common';
import { fail, redirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import modules that will be mocked
import * as auth from '$lib/services/server/auth';
import { userService } from '$lib/services/server/user.service';
import { verify } from '@node-rs/argon2';
import { superValidate, message, setError } from 'sveltekit-superforms';

// Mock dependencies
vi.mock('$lib/services/server/user.service', () => ({
	userService: {
		findAnyUserByEmail: vi.fn(),
		confirmEmail: vi.fn()
	}
}));

vi.mock('$lib/services/server/auth', () => ({
	generateSessionToken: vi.fn(),
	createSession: vi.fn(),
	setSessionTokenCookie: vi.fn(),
	createUser: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
	fail: vi.fn(),
	redirect: vi.fn()
}));

vi.mock('@node-rs/argon2', () => ({
	hash: vi.fn(),
	verify: vi.fn()
}));

vi.mock('$lib/services/server/login-token.service', () => ({
	loginTokenService: {
		createLoginToken: vi.fn(),
		validateLoginToken: vi.fn()
	}
}));

vi.mock('$lib/services/server/mail.service.js', () => ({
	mailService: {
		sendLoginEmail: vi.fn().mockResolvedValue(undefined)
	}
}));

vi.mock('sveltekit-superforms', () => ({
	superValidate: vi.fn(),
	message: vi.fn(),
	setError: vi.fn()
}));

vi.mock('sveltekit-superforms/adapters', () => ({
	zod4: vi.fn()
}));

describe('Authentication Server Actions', () => {
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

		describe('loginSchema', () => {
			it('should validate complete login input', () => {
				const validInput = {
					email: 'test@example.com',
					password: 'password123'
				};
				expect(loginSchema.safeParse(validInput).success).toBe(true);
			});

			it('should reject invalid login input', () => {
				const invalidInputs = [
					{ email: 'invalid', password: 'password123' },
					{ email: 'test@example.com', password: '123' },
					{ email: '', password: '' },
					{ email: 'test@example.com' }, // missing password
					{ password: 'password123' } // missing email
				];

				invalidInputs.forEach((input) => {
					expect(loginSchema.safeParse(input).success).toBe(false);
				});
			});
		});
	});

	describe('Server Actions', () => {
		const createMockEvent = () => ({
			request: new Request('http://localhost', { method: 'POST' }),
			locals: { user: null, session: null },
			url: { origin: 'http://localhost:5173' }
		});

		describe('Login Action', () => {
			it('should handle successful login flow', async () => {
				const { actions } = await import('./+page.server.js');

				const mockForm = {
					valid: true,
					data: { email: 'test@example.com', password: 'password123' }
				};
				vi.mocked(superValidate).mockResolvedValue(mockForm as never);

				vi.mocked(redirect).mockImplementation(() => {
					throw new Error('redirect');
				});

				const mockUser = {
					id: 'user-123',
					email: 'test@example.com',
					passwordHash: 'hashed-password',
					email_confirmed_at: new Date()
				};

				vi.mocked(userService.findAnyUserByEmail).mockResolvedValue(
					mockUser as never
				);
				vi.mocked(verify).mockResolvedValue(true);

				vi.mocked(auth.generateSessionToken).mockReturnValue('session-token');
				vi.mocked(auth.createSession).mockResolvedValue({
					id: 'session-123',
					user_id: 'user-123',
					expires_at: new Date('2025-01-01')
				});
				vi.mocked(auth.setSessionTokenCookie).mockImplementation(() => {});

				const mockEvent = createMockEvent();

				await expect(actions.login(mockEvent as never)).rejects.toThrow(
					'redirect'
				);
				expect(redirect).toHaveBeenCalledWith(302, '/auth/account');
			});

			it('should handle invalid input', async () => {
				const { actions } = await import('./+page.server.js');

				const mockForm = { valid: false };
				vi.mocked(superValidate).mockResolvedValue(mockForm as never);
				vi.mocked(fail).mockReturnValue({ status: 400 } as never);

				const mockEvent = createMockEvent();

				await actions.login(mockEvent as never);
				expect(fail).toHaveBeenCalledWith(400, { form: mockForm });
			});

			it('should handle user not found', async () => {
				const { actions } = await import('./+page.server.js');

				const mockForm = {
					valid: true,
					data: {
						email: 'nonexistent@example.com',
						password: 'password123'
					}
				};
				vi.mocked(superValidate).mockResolvedValue(mockForm as never);
				vi.mocked(userService.findAnyUserByEmail).mockResolvedValue(null);

				const mockEvent = createMockEvent();

				await actions.login(mockEvent as never);
				expect(setError).toHaveBeenCalledWith(
					mockForm,
					'email',
					'Incorrect email or password'
				);
			});

			it('should handle incorrect password', async () => {
				const { actions } = await import('./+page.server.js');

				const mockForm = {
					valid: true,
					data: { email: 'test@example.com', password: 'wrongpassword' }
				};
				vi.mocked(superValidate).mockResolvedValue(mockForm as never);

				const mockUser = {
					id: 'user-123',
					email: 'test@example.com',
					passwordHash: 'hashed-password',
					email_confirmed_at: new Date()
				};

				vi.mocked(userService.findAnyUserByEmail).mockResolvedValue(
					mockUser as never
				);
				vi.mocked(verify).mockResolvedValue(false);

				const mockEvent = createMockEvent();

				await actions.login(mockEvent as never);
				expect(setError).toHaveBeenCalledWith(
					mockForm,
					'email',
					'Incorrect email or password'
				);
			});

			it('should handle unconfirmed email', async () => {
				const { actions } = await import('./+page.server.js');

				const mockForm = {
					valid: true,
					data: { email: 'test@example.com', password: 'password123' }
				};
				vi.mocked(superValidate).mockResolvedValue(mockForm as never);

				const mockUser = {
					id: 'user-123',
					email: 'test@example.com',
					passwordHash: 'hashed-password',
					email_confirmed_at: null
				};

				vi.mocked(userService.findAnyUserByEmail).mockResolvedValue(
					mockUser as never
				);
				vi.mocked(verify).mockResolvedValue(true);

				const mockEvent = createMockEvent();

				await actions.login(mockEvent as never);
				expect(message).toHaveBeenCalledWith(
					mockForm,
					{
						text: 'Please confirm your email before logging in',
						code: 'EMAIL_NOT_CONFIRMED',
						email: 'test@example.com'
					},
					{ status: 400 }
				);
			});
		});
	});
});
