import { getRequestEvent } from '$app/server';
import { hasPermission, type Permission } from '$lib/schemas/permissions';
import type { PublicUser } from '$lib/schemas/user';
import { error, redirect } from '@sveltejs/kit';

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
