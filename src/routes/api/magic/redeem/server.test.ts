import { ServiceError } from '$lib/services/server/errors';
import { error, redirect } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('$lib/services/server/magic-link.service', () => ({
	magicLinkService: {
		getMagicLinkFromToken: vi.fn(),
		useMagicInvite: vi.fn(),
		validateMagicLogin: vi.fn()
	}
}));

vi.mock('$lib/services/server/auth', () => ({
	generateSessionToken: vi.fn(),
	createSession: vi.fn(),
	setSessionTokenCookie: vi.fn()
}));

vi.mock('@sveltejs/kit', () => ({
	error: vi.fn(),
	redirect: vi.fn()
}));

// Import after mocking
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { magicLinkService } from '$lib/services/server/magic-link.service';
import { GET } from './+server';

describe('Magic Link Redeem API', () => {
	const mockEvent = (token?: string) => ({
		url: new URL(`http://localhost:3000/api/magic/redeem${token ? `?token=${token}` : ''}`),
		cookies: {}
	});

	const mockSession = {
		id: 'session-123',
		user_id: 'user-123',
		expires_at: new Date(),
		created_at: new Date(),
		updated_at: new Date()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(generateSessionToken).mockReturnValue('session-token-123');
		vi.mocked(createSession).mockResolvedValue(mockSession);
		vi.mocked(setSessionTokenCookie).mockImplementation(() => {});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('Invite Redemption', () => {
		it('should successfully redeem magic invite and create user session', async () => {
			const mockMagicLink = {
				id: 'magic-123',
				type: 'invite' as const,
				expires_at: new Date(Date.now() + 86400000),
				used_at: null
			};

			const mockNewUser = {
				id: 'user-123',
				email: 'newuser@example.com',
				organization_id: 'org-123',
				created_at: new Date(),
				updated_at: new Date()
			};

			vi.mocked(magicLinkService.getMagicLinkFromToken).mockResolvedValue(mockMagicLink);
			vi.mocked(magicLinkService.useMagicInvite).mockResolvedValue(mockNewUser);
			vi.mocked(redirect).mockImplementation((status, location) => {
				const err = new Error(`Redirect to ${location}`);
				(err as any).status = status;
				throw err;
			});

			await expect(GET(mockEvent('valid-token') as never)).rejects.toThrow(
				'Redirect to /dashboard'
			);

			expect(magicLinkService.getMagicLinkFromToken).toHaveBeenCalledWith('valid-token');
			expect(magicLinkService.useMagicInvite).toHaveBeenCalledWith('valid-token');
			expect(generateSessionToken).toHaveBeenCalled();
			expect(createSession).toHaveBeenCalledWith('session-token-123', 'user-123');
			expect(setSessionTokenCookie).toHaveBeenCalledWith(
				expect.any(Object),
				'session-token-123',
				mockSession.expires_at
			);
		});
	});

	describe('Login Redemption', () => {
		it('should successfully redeem magic login and create user session', async () => {
			const mockMagicLink = {
				id: 'magic-123',
				type: 'login' as const,
				expires_at: new Date(Date.now() + 86400000),
				used_at: null
			};

			const mockUser = {
				id: 'user-123',
				email: 'existing@example.com',
				organization_id: 'org-123',
				created_at: new Date(),
				updated_at: new Date()
			};

			vi.mocked(magicLinkService.getMagicLinkFromToken).mockResolvedValue(mockMagicLink);
			vi.mocked(magicLinkService.validateMagicLogin).mockResolvedValue(mockUser);
			vi.mocked(redirect).mockImplementation((status, location) => {
				const err = new Error(`Redirect to ${location}`);
				(err as any).status = status;
				throw err;
			});

			await expect(GET(mockEvent('valid-token') as never)).rejects.toThrow(
				'Redirect to /dashboard'
			);

			expect(magicLinkService.getMagicLinkFromToken).toHaveBeenCalledWith('valid-token');
			expect(magicLinkService.validateMagicLogin).toHaveBeenCalledWith('valid-token');
			expect(generateSessionToken).toHaveBeenCalled();
			expect(createSession).toHaveBeenCalledWith('session-token-123', 'user-123');
			expect(setSessionTokenCookie).toHaveBeenCalledWith(
				expect.any(Object),
				'session-token-123',
				mockSession.expires_at
			);
		});
	});

	describe('Error Handling', () => {
		it('should fail when token parameter is missing', async () => {
			await GET(mockEvent() as never);

			expect(error).toHaveBeenCalledWith(400, 'Missing token parameter');
		});

		it('should fail when magic link is invalid', async () => {
			vi.mocked(magicLinkService.getMagicLinkFromToken).mockResolvedValue(null);

			await GET(mockEvent('invalid-token') as never);

			expect(error).toHaveBeenCalledWith(400, 'Invalid or expired magic link');
		});

		it('should handle ServiceError with correct status code', async () => {
			vi.mocked(magicLinkService.getMagicLinkFromToken).mockRejectedValue(
				ServiceError.notFound('Magic link not found')
			);

			await GET(mockEvent('valid-token') as never);

			expect(error).toHaveBeenCalledWith(404, 'Magic link not found');
		});

		it('should handle unexpected errors with 500 status', async () => {
			vi.mocked(magicLinkService.getMagicLinkFromToken).mockRejectedValue(
				new Error('Database error')
			);

			await GET(mockEvent('valid-token') as never);

			expect(error).toHaveBeenCalledWith(500, 'Failed to redeem magic link');
		});
	});
});
