import { ServiceError } from '$lib/services/server/errors';
import { error, json } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('$lib/services/server/magic-link.service', () => ({
	magicLinkService: {
		createMagicInvite: vi.fn(),
		createMagicLogin: vi.fn()
	}
}));

vi.mock('$lib/services/server/user.service', () => ({
	userService: {
		findAnyUserByEmail: vi.fn()
	}
}));

vi.mock('@sveltejs/kit', () => ({
	error: vi.fn(),
	json: vi.fn()
}));

// Import after mocking
import { magicLinkService } from '$lib/services/server/magic-link.service';
import { userService } from '$lib/services/server/user.service';
import { POST } from './+server';

describe('Magic Link Request API', () => {
	const mockUser = {
		id: 'user-123',
		organization_id: 'org-123',
		email: 'admin@example.com',
		created_at: new Date(),
		updated_at: new Date()
	};

	const mockRequest = (body: Record<string, unknown>) => ({
		request: {
			json: vi.fn().mockResolvedValue(body)
		},
		locals: { user: mockUser }
	});

	beforeEach(() => {
		vi.clearAllMocks();
		// Default mock implementations
		vi.mocked(json).mockImplementation((data, options) => ({ data, options }) as never);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('Invite Link Creation', () => {
		it('should successfully create a magic invite when user does not exist', async () => {
			// Setup mocks - user doesn't exist (returns null), invite should be created
			vi.mocked(userService.findAnyUserByEmail).mockResolvedValue(null);
			vi.mocked(magicLinkService.createMagicInvite).mockResolvedValue({
				magicInvite: { id: 'invite-123', expires_at: new Date() } as never,
				token: 'token-123'
			});

			const requestData = {
				type: 'invite',
				email: 'newuser@example.com',
				token_duration_hours: 24
			};

			await POST(mockRequest(requestData) as never);

			expect(userService.findAnyUserByEmail).toHaveBeenCalledWith('newuser@example.com');
			expect(magicLinkService.createMagicInvite).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'invite',
					email: 'newuser@example.com',
					invitee_organization_id: 'org-123'
				}),
				'org-123'
			);
			// Updated: server returns magicInvite directly, not { invite_id }
			expect(json).toHaveBeenCalledWith({ id: 'invite-123', expires_at: expect.any(Date) });
		});

		it('should fail when user is not authenticated', async () => {
			const requestData = {
				type: 'invite',
				email: 'newuser@example.com'
			};

			// Mock request with no user in locals
			const mockRequestNoAuth = (body: Record<string, unknown>) => ({
				request: {
					json: vi.fn().mockResolvedValue(body)
				},
				locals: {} // No user
			});

			await POST(mockRequestNoAuth(requestData) as never);

			expect(error).toHaveBeenCalledWith(400, 'Unauthorized');
			expect(magicLinkService.createMagicInvite).not.toHaveBeenCalled();
		});

		it('should fail when user with email already exists', async () => {
			vi.mocked(userService.findAnyUserByEmail).mockResolvedValue({
				id: 'existing-user',
				email: 'existing@example.com',
				created_at: new Date(),
				updated_at: new Date(),
				organization_id: 'org-123',
				passwordHash: null
			});

			const requestData = {
				type: 'invite',
				email: 'existing@example.com'
			};

			await POST(mockRequest(requestData) as never);

			expect(userService.findAnyUserByEmail).toHaveBeenCalledWith('existing@example.com');
			expect(error).toHaveBeenCalledWith(400, 'A user with this email already exists');
			expect(magicLinkService.createMagicInvite).not.toHaveBeenCalled();
		});

		it('should fail with invalid email', async () => {
			const requestData = {
				type: 'invite',
				email: 'invalid-email'
			};

			await POST(mockRequest(requestData) as never);

			expect(error).toHaveBeenCalledWith(400, expect.stringContaining('Validation error'));
		});

		it('should handle validation errors for invalid email', async () => {
			const requestData = {
				type: 'invite',
				email: 'invalid-email' // Invalid email format
			};

			await POST(mockRequest(requestData) as never);

			expect(error).toHaveBeenCalledWith(400, expect.stringContaining('Validation error'));
		});
	});

	describe('Login Link Creation', () => {
		it('should successfully create a magic login for existing user', async () => {
			const existingUser = {
				id: 'user-456',
				email: 'existing@example.com',
				created_at: new Date(),
				updated_at: new Date(),
				organization_id: 'org-456',
				passwordHash: null
			};
			vi.mocked(userService.findAnyUserByEmail).mockResolvedValue(existingUser);
			vi.mocked(magicLinkService.createMagicLogin).mockResolvedValue({
				login: { id: 'login-123', expires_at: new Date() } as never,
				token: 'token-123'
			});

			const requestData = {
				type: 'login',
				email: 'existing@example.com',
				token_duration_hours: 24
			};

			await POST(mockRequest(requestData) as never);

			expect(userService.findAnyUserByEmail).toHaveBeenCalledWith('existing@example.com');
			expect(magicLinkService.createMagicLogin).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'login',
					user_id: 'user-456'
				})
			);
			expect(json).toHaveBeenCalledWith({
				message: 'If an account with this email exists, a login link has been sent'
			});
		});

		it('should not reveal error when user does not exist', async () => {
			vi.mocked(userService.findAnyUserByEmail).mockResolvedValue(null);

			const requestData = {
				type: 'login',
				email: 'nonexistent-user@example.com'
			};

			await POST(mockRequest(requestData) as never);

			expect(userService.findAnyUserByEmail).toHaveBeenCalledWith('nonexistent-user@example.com');
			expect(magicLinkService.createMagicLogin).not.toHaveBeenCalled();
			expect(json).toHaveBeenCalledWith({
				message: 'If an account with this email exists, a login link has been sent'
			});
		});
	});

	describe('Error Handling', () => {
		it('should handle ZodError with detailed validation message', async () => {
			const requestData = {
				type: 'invalid-type',
				email: 'test@example.com'
			};

			await POST(mockRequest(requestData) as never);

			expect(error).toHaveBeenCalledWith(400, expect.stringContaining('Validation error'));
		});

		it('should handle ServiceError with correct status code', async () => {
			// When findAnyUserByEmail throws, it goes to catch block and returns that error
			vi.mocked(userService.findAnyUserByEmail).mockRejectedValue(
				ServiceError.forbidden('Test error')
			);

			const requestData = {
				type: 'invite',
				email: 'test@example.com'
			};

			await POST(mockRequest(requestData) as never);

			expect(error).toHaveBeenCalledWith(403, 'Test error');
		});

		it('should handle unexpected errors with 500 status', async () => {
			vi.mocked(userService.findAnyUserByEmail).mockRejectedValue(new Error('Database error'));

			const requestData = {
				type: 'invite',
				email: 'test@example.com'
			};

			await POST(mockRequest(requestData) as never);

			expect(error).toHaveBeenCalledWith(500, 'Failed to create magic link');
		});
	});
});
