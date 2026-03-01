import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicUser, Role } from '$lib/schemas/user';
import { hasPermission, type Permission } from '$lib/schemas/permissions';
import {
	requireAuth,
	requirePermission,
	requirePermissionApi
} from './permissions';

// Mock getRequestEvent from SvelteKit
vi.mock('$app/server', () => ({
	getRequestEvent: vi.fn()
}));

import { getRequestEvent } from '$app/server';

/**
 * Permission System Tests
 *
 * Tests for role-based permission checking functions.
 * Uses mocks for SvelteKit's getRequestEvent to test requireAuth,
 * requirePermission, and requirePermissionApi.
 */

// Helper to create mock user with specific role
function createMockUser(role: Role): PublicUser {
	return {
		id: '00000000-0000-0000-0000-000000000001',
		organization_id: '00000000-0000-0000-0000-000000000002',
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		name: 'Test User',
		email: 'test@example.com',
		role,
		email_confirmed_at: new Date()
	};
}

// Helper to mock request event
function mockRequestEvent(user: PublicUser | null) {
	vi.mocked(getRequestEvent).mockReturnValue({
		locals: {
			user,
			session: user ? { id: 'session-id', expires_at: new Date() } : null,
			permissions: []
		}
	} as unknown as ReturnType<typeof getRequestEvent>);
}

describe('Permission System', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('hasPermission()', () => {
		it('returns true for admin with any permission', () => {
			const allPermissions: Permission[] = [
				'users:read',
				'users:create',
				'users:update',
				'users:delete',
				'resources:read',
				'resources:create',
				'resources:update',
				'resources:delete',
				'routes:read'
			];

			for (const permission of allPermissions) {
				expect(hasPermission('admin', permission)).toBe(true);
			}
		});

		it('returns true for member with resources:create', () => {
			expect(hasPermission('member', 'resources:create')).toBe(true);
		});

		it('returns false for member with users:create', () => {
			expect(hasPermission('member', 'users:create')).toBe(false);
		});

		it('returns false for viewer with resources:update', () => {
			expect(hasPermission('viewer', 'resources:update')).toBe(false);
		});

		it('returns true for driver with routes:read', () => {
			expect(hasPermission('driver', 'routes:read')).toBe(true);
		});

		it('returns false for driver with resources:read', () => {
			expect(hasPermission('driver', 'resources:read')).toBe(false);
		});

		it('returns false for invalid role', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect(hasPermission('invalid' as any, 'resources:read')).toBe(false);
		});

		it('handles undefined gracefully', () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect(hasPermission(undefined as any, 'resources:read')).toBe(false);
		});
	});

	describe('requireAuth()', () => {
		it('returns user when authenticated', () => {
			const mockUser = createMockUser('member');
			mockRequestEvent(mockUser);

			const result = requireAuth();

			expect(result).toEqual(mockUser);
		});

		it('redirects to login when unauthenticated', () => {
			mockRequestEvent(null);

			try {
				requireAuth();
				expect.fail('Should have thrown');
			} catch (e) {
				// SvelteKit's redirect() throws an object with status and location
				const redirect = e as { status: number; location: string };
				expect(redirect.status).toBe(302);
				expect(redirect.location).toBe('/auth/login');
			}
		});
	});

	describe('requirePermission()', () => {
		it('redirects to login when no user', () => {
			mockRequestEvent(null);

			try {
				requirePermission('resources:read');
				expect.fail('Should have thrown');
			} catch (e) {
				// SvelteKit's redirect() throws an object with status and location
				const redirect = e as { status: number; location: string };
				expect(redirect.status).toBe(302);
				expect(redirect.location).toBe('/auth/login');
			}
		});

		it('throws 403 when permission denied', () => {
			const mockUser = createMockUser('viewer');
			mockRequestEvent(mockUser);

			try {
				requirePermission('resources:update');
				expect.fail('Should have thrown');
			} catch (e) {
				// SvelteKit's error() throws an HttpError
				expect((e as { status: number }).status).toBe(403);
				expect((e as { body: { code: string } }).body.code).toBe('FORBIDDEN');
			}
		});

		it('returns user when permission granted', () => {
			const mockUser = createMockUser('member');
			mockRequestEvent(mockUser);

			const result = requirePermission('resources:read');

			expect(result).toEqual(mockUser);
		});

		it('admin passes all permission checks', () => {
			const mockUser = createMockUser('admin');
			mockRequestEvent(mockUser);

			const permissions: Permission[] = [
				'users:read',
				'users:create',
				'users:update',
				'users:delete',
				'resources:read',
				'resources:create',
				'resources:update',
				'resources:delete',
				'routes:read'
			];

			for (const permission of permissions) {
				expect(requirePermission(permission)).toEqual(mockUser);
			}
		});

		it('driver fails resources:read check', () => {
			const mockUser = createMockUser('driver');
			mockRequestEvent(mockUser);

			try {
				requirePermission('resources:read');
				expect.fail('Should have thrown');
			} catch (e) {
				expect((e as { status: number }).status).toBe(403);
			}
		});
	});

	describe('requirePermissionApi()', () => {
		it('throws 401 when no user', () => {
			mockRequestEvent(null);

			try {
				requirePermissionApi('resources:read');
				expect.fail('Should have thrown');
			} catch (e) {
				expect((e as { status: number }).status).toBe(401);
				expect((e as { body: { code: string } }).body.code).toBe(
					'UNAUTHORIZED'
				);
			}
		});

		it('throws 403 when permission denied', () => {
			const mockUser = createMockUser('viewer');
			mockRequestEvent(mockUser);

			try {
				requirePermissionApi('resources:create');
				expect.fail('Should have thrown');
			} catch (e) {
				expect((e as { status: number }).status).toBe(403);
				expect((e as { body: { code: string } }).body.code).toBe('FORBIDDEN');
			}
		});

		it('returns user when permission granted', () => {
			const mockUser = createMockUser('admin');
			mockRequestEvent(mockUser);

			const result = requirePermissionApi('users:delete');

			expect(result).toEqual(mockUser);
		});

		it('error includes correct code and message', () => {
			const mockUser = createMockUser('driver');
			mockRequestEvent(mockUser);

			try {
				requirePermissionApi('resources:read');
				expect.fail('Should have thrown');
			} catch (e) {
				const error = e as {
					status: number;
					body: { code: string; message: string };
				};
				expect(error.status).toBe(403);
				expect(error.body.code).toBe('FORBIDDEN');
				expect(error.body.message).toBe('Insufficient permissions');
			}
		});

		it('admin passes all permission checks', () => {
			const mockUser = createMockUser('admin');
			mockRequestEvent(mockUser);

			const permissions: Permission[] = [
				'users:read',
				'users:create',
				'users:update',
				'users:delete',
				'resources:read',
				'resources:create',
				'resources:update',
				'resources:delete',
				'routes:read'
			];

			for (const permission of permissions) {
				expect(requirePermissionApi(permission)).toEqual(mockUser);
			}
		});

		it('viewer fails resources:create check', () => {
			const mockUser = createMockUser('viewer');
			mockRequestEvent(mockUser);

			try {
				requirePermissionApi('resources:create');
				expect.fail('Should have thrown');
			} catch (e) {
				expect((e as { status: number }).status).toBe(403);
			}
		});
	});

	describe('User Organization Context', () => {
		it('returned user includes organization_id', () => {
			const mockUser = createMockUser('member');
			mockRequestEvent(mockUser);

			const result = requirePermission('resources:read');

			expect(result.organization_id).toBe(mockUser.organization_id);
			expect(result.organization_id).toBeDefined();
		});

		it('permission check does not expose other user data', () => {
			const mockUser = createMockUser('admin');
			mockRequestEvent(mockUser);

			const result = requirePermissionApi('users:read');

			// Ensure no passwordHash in the returned user
			expect(result).not.toHaveProperty('passwordHash');
			// Confirm standard fields are present
			expect(result).toHaveProperty('id');
			expect(result).toHaveProperty('email');
			expect(result).toHaveProperty('role');
		});
	});
});
