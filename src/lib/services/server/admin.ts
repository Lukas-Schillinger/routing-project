import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import type { PublicUser } from '$lib/schemas/user';

/**
 * Parse admin emails from environment variable.
 * Expects comma-separated list: "admin@example.com,admin2@example.com"
 */
function getAdminEmails(): string[] {
	const adminEmailsEnv = env.ADMIN_EMAILS || '';
	return adminEmailsEnv
		.split(',')
		.map((email) => email.trim().toLowerCase())
		.filter((email) => email.length > 0);
}

/**
 * Check if an email is in the global admin whitelist.
 */
export function isGlobalAdmin(email: string): boolean {
	return getAdminEmails().includes(email.toLowerCase());
}

/**
 * Get the current user or throw an appropriate error.
 * For API routes, throws 401. For page routes, redirects to login.
 */
function getAuthenticatedUser(isApiRoute: boolean): PublicUser {
	const request = getRequestEvent();

	if (!request.locals.user) {
		if (isApiRoute) {
			throw error(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' });
		}
		throw redirect(302, '/auth/login');
	}

	return request.locals.user as PublicUser;
}

/**
 * Verify the user has global admin access.
 */
function verifyAdminAccess(user: PublicUser): void {
	if (!isGlobalAdmin(user.email)) {
		throw error(403, {
			code: 'FORBIDDEN',
			message: 'Admin access required'
		});
	}
}

/**
 * Require global admin access for page routes.
 * Redirects to login if not authenticated, throws 403 if not admin.
 */
export function requireAdmin(): PublicUser {
	const user = getAuthenticatedUser(false);
	verifyAdminAccess(user);
	return user;
}

/**
 * Require global admin access for API routes.
 * Throws 401 if not authenticated, 403 if not admin.
 */
export function requireAdminApi(): PublicUser {
	const user = getAuthenticatedUser(true);
	verifyAdminAccess(user);
	return user;
}
