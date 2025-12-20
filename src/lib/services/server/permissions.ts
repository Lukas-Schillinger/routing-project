import { getRequestEvent } from '$app/server';
import type { PublicUser, Role } from '$lib/schemas/user';
import { db } from '$lib/server/db';
import { drivers } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
// Note: This import creates a circular dependency with route.service.ts
// but it works at runtime because both modules export different things
import { routeService } from './route.service';

export type Permission =
	| 'users:read'
	| 'users:create'
	| 'users:update'
	| 'users:delete'
	| 'resources:read'
	| 'resources:create'
	| 'resources:update'
	| 'resources:delete'
	| 'routes:read';

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
		'routes:read'
	],
	member: ['resources:read', 'resources:create', 'resources:update', 'routes:read'],
	viewer: ['resources:read', 'routes:read'],
	driver: ['routes:read']
};

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
		throw error(403, 'Insufficient permissions');
	}

	return user;
}

/**
 * Get user from request with permission validation - for API routes
 */
export function requirePermissionApi(permission: Permission): PublicUser {
	const request = getRequestEvent();
	if (!request.locals.user) {
		throw error(401, 'Unauthorized');
	}

	const user = request.locals.user as PublicUser;

	if (!hasPermission(user.role, permission)) {
		throw error(403, 'Insufficient permissions');
	}

	return user;
}

/**
 * Get user OR allow access if route is public (temp driver) - for API routes
 * Returns 'public' if route belongs to a temporary driver
 * Returns PublicUser if user is authenticated
 * Throws 401 if neither
 */
export async function authorizeRouteAccessApi(routeId: string): Promise<PublicUser | 'public'> {
	if (await routeService.isRoutePublic(routeId)) {
		return 'public';
	}

	const request = getRequestEvent();
	if (!request.locals.user) {
		throw error(401, 'Unauthorized');
	}
	return request.locals.user as PublicUser;
}

/**
 * Get user OR allow access if route is public (temp driver) - for page routes
 * Returns 'public' if route belongs to a temporary driver
 * Returns PublicUser if user is authenticated
 * Redirects to login if neither
 */
export async function authorizeRouteAccess(routeId: string): Promise<PublicUser | 'public'> {
	if (await routeService.isRoutePublic(routeId)) {
		return 'public';
	}

	const request = getRequestEvent();
	if (!request.locals.user) {
		throw redirect(302, '/auth/login');
	}
	return request.locals.user as PublicUser;
}

/**
 * For driver role: Get the driver record linked to this user
 * Returns null if user is not linked to a driver
 */
export async function getDriverForUser(
	userId: string,
	organizationId: string
): Promise<typeof drivers.$inferSelect | null> {
	const [driver] = await db
		.select()
		.from(drivers)
		.where(and(eq(drivers.user_id, userId), eq(drivers.organization_id, organizationId)))
		.limit(1);

	return driver ?? null;
}

/**
 * Check if a driver user can access a specific route
 */
export async function canDriverAccessRoute(
	userId: string,
	organizationId: string,
	routeId: string
): Promise<boolean> {
	const driver = await getDriverForUser(userId, organizationId);
	if (!driver) return false;

	try {
		const route = await routeService.getRouteById(routeId, organizationId);
		return route.driver_id === driver.id;
	} catch {
		return false;
	}
}
