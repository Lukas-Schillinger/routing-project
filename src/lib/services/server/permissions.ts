import { getRequestEvent } from '$app/server';
import type { PublicUser, Role } from '$lib/schemas/user';
import { error, redirect } from '@sveltejs/kit';

export type Permission =
	| 'users:read'
	| 'users:create'
	| 'users:update'
	| 'users:delete'
	| 'resources:read'
	| 'resources:create'
	| 'resources:update'
	| 'resources:delete'
	| 'routes:read'
	| 'billing:read'
	| 'billing:update';

export const rolePermissions: Record<Role, Permission[]> = {
	admin: [
		'users:read',
		'users:create',
		'users:update',
		'users:delete',
		'resources:read',
		'resources:create',
		'resources:update',
		'resources:delete',
		'routes:read',
		'billing:read',
		'billing:update'
	],
	member: [
		'resources:read',
		'resources:create',
		'resources:update',
		'routes:read',
		'billing:read'
	],
	viewer: ['resources:read', 'routes:read'],
	driver: ['routes:read']
};

export const roleDescriptions = [
	{ name: 'admin', desc: 'set permissions, invite users' },
	{ name: 'member', desc: 'modify and share maps' },
	{ name: 'viewer', desc: 'view maps without modifying' },
	{ name: 'driver', desc: 'view and update assigned routes' }
];

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
	return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Get authenticated user - for page routes that just need auth (no permission check)
 * Redirects to login if not authenticated
 */
export function requireAuth(): PublicUser {
	const request = getRequestEvent();
	if (!request.locals.user) {
		throw redirect(302, '/auth/login');
	}
	return request.locals.user as PublicUser;
}

/**
 * Get user from request with permission validation - for page routes
 * Redirects to login if not authenticated, throws 403 if permission denied
 */
export function requirePermission(permission: Permission): PublicUser {
	const request = getRequestEvent();
	if (!request.locals.user) {
		throw redirect(302, '/auth/login');
	}

	const user = request.locals.user as PublicUser;

	if (!hasPermission(user.role, permission)) {
		throw error(403, {
			code: 'FORBIDDEN',
			message: 'Insufficient permissions'
		});
	}

	return user;
}

/**
 * Get user from request with permission validation - for API routes
 */
export function requirePermissionApi(permission: Permission): PublicUser {
	const request = getRequestEvent();
	if (!request.locals.user) {
		throw error(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' });
	}

	const user = request.locals.user as PublicUser;

	if (!hasPermission(user.role, permission)) {
		throw error(403, {
			code: 'FORBIDDEN',
			message: 'Insufficient permissions'
		});
	}

	return user;
}
