import type { Role } from '$lib/schemas/user';

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
