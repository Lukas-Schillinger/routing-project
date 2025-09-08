import { validateEmail, validatePassword } from '$lib/validation';
import { fail, redirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('$lib/server/db', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn()
	}
}));

vi.mock('$lib/server/auth', () => ({
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

describe('Authentication Server Actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('Validation Functions', () => {
		describe('validateEmail', () => {
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
					expect(validateEmail(email)).toBe(true);
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
					expect(validateEmail(email)).toBe(false);
				});
			});

			it('should reject emails that are too short', () => {
				expect(validateEmail('a@')).toBe(false);
				expect(validateEmail('ab')).toBe(false);
			});

			it('should reject emails that are too long', () => {
				const longEmail = 'a'.repeat(250) + '@example.com';
				expect(validateEmail(longEmail)).toBe(false);
			});
		});

		describe('validatePassword', () => {
			it('should accept valid password lengths', () => {
				const validPasswords = [
					'123456', // minimum length
					'password123',
					'complex!Password123',
					'a'.repeat(255) // maximum length
				];

				validPasswords.forEach((password) => {
					expect(validatePassword(password)).toBe(true);
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
					expect(validatePassword(password)).toBe(false);
				});
			});
		});
	});

	describe('Server Actions', () => {
		// Helper function to create mock form data
		const createMockEvent = (email: string, password: string) => ({
			request: {
				formData: vi.fn().mockResolvedValue(
					new Map([
						['email', email],
						['password', password]
					])
				)
			},
			locals: { user: null, session: null }
		});

		describe('Login Action', () => {
			it('should handle successful login flow', async () => {
				const { actions } = await import('./+page.server.js');
				const { db } = await import('$lib/server/db');
				const auth = await import('$lib/server/auth');
				const { verify } = await import('@node-rs/argon2');

				// Mock successful database query
				const mockUser = {
					id: 'user-123',
					email: 'test@example.com',
					passwordHash: 'hashed-password'
				};

				vi.mocked(db.select).mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([mockUser])
					})
				} as never);

				// Mock successful password verification
				vi.mocked(verify).mockResolvedValue(true);

				// Mock auth functions
				vi.mocked(auth.generateSessionToken).mockReturnValue('session-token');
				vi.mocked(auth.createSession).mockResolvedValue({
					id: 'session-123',
					user_id: 'user-123',
					expires_at: new Date('2025-01-01')
				});
				vi.mocked(auth.setSessionTokenCookie).mockImplementation(() => {});

				// Mock SvelteKit functions
				vi.mocked(redirect).mockImplementation(() => {
					throw new Error('redirect'); // SvelteKit redirects throw
				});

				const mockEvent = createMockEvent('test@example.com', 'password123');

				// Should throw redirect
				await expect(actions.login(mockEvent as never)).rejects.toThrow('redirect');
				expect(redirect).toHaveBeenCalledWith(302, '/demo/lucia');
			});

			it('should handle invalid email', async () => {
				const { actions } = await import('./+page.server.js');

				vi.mocked(fail).mockReturnValue({ status: 400 } as never);
				const mockEvent = createMockEvent('invalid-email', 'password123');

				await actions.login(mockEvent as never);
				expect(fail).toHaveBeenCalledWith(400, {
					message: 'Please enter a valid email address'
				});
			});

			it('should handle user not found', async () => {
				const { actions } = await import('./+page.server.js');
				const { db } = await import('$lib/server/db');

				// Mock empty database result
				vi.mocked(db.select).mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([])
					})
				} as never);

				vi.mocked(fail).mockReturnValue({ status: 400 } as never);
				const mockEvent = createMockEvent('nonexistent@example.com', 'password123');

				await actions.login(mockEvent as never);
				expect(fail).toHaveBeenCalledWith(400, {
					message: 'Incorrect email or password'
				});
			});

			it('should handle incorrect password', async () => {
				const { actions } = await import('./+page.server.js');
				const { db } = await import('$lib/server/db');
				const { verify } = await import('@node-rs/argon2');

				const mockUser = {
					id: 'user-123',
					email: 'test@example.com',
					passwordHash: 'hashed-password'
				};

				vi.mocked(db.select).mockReturnValue({
					from: vi.fn().mockReturnValue({
						where: vi.fn().mockResolvedValue([mockUser])
					})
				} as never);

				// Mock failed password verification
				vi.mocked(verify).mockResolvedValue(false);
				vi.mocked(fail).mockReturnValue({ status: 400 } as never);

				const mockEvent = createMockEvent('test@example.com', 'wrongpassword');

				await actions.login(mockEvent as never);
				expect(fail).toHaveBeenCalledWith(400, {
					message: 'Incorrect email or password'
				});
			});
		});

		describe('Register Action', () => {
			it('should handle successful registration', async () => {
				const { actions } = await import('./+page.server.js');
				const auth = await import('$lib/server/auth');

				// Mock the createUser function
				vi.mocked(auth.createUser).mockResolvedValue({ id: 'new-user-123' });

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
								['password', 'password123']
							])
						)
					},
					locals: { user: null, session: null }
				};

				await expect(actions.register(mockEvent as never)).rejects.toThrow('redirect');
				expect(redirect).toHaveBeenCalledWith(302, '/demo/lucia');
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
				const { db } = await import('$lib/server/db');

				// Mock database error
				vi.mocked(db.insert).mockReturnValue({
					values: vi.fn().mockReturnValue({
						returning: vi.fn().mockRejectedValue(new Error('Unique constraint violation'))
					})
				} as never);

				vi.mocked(fail).mockReturnValue({ status: 500 } as never);

				const mockEvent = {
					request: {
						formData: vi.fn().mockResolvedValue(
							new Map([
								['email', 'existing@example.com'],
								['password', 'password123']
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
