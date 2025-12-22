// User management endpoints (admin only)

import type { PublicUser } from '$lib/schemas';
import { updateUserRoleSchema } from '$lib/schemas';
import { ServiceError } from '$lib/services/server/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { userService } from '$lib/services/server/user.service';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PATCH /api/auth/users/[userId] - Update user role
export const PATCH: RequestHandler = async ({ params, request }): Promise<Response> => {
	const user = requirePermissionApi('users:update');

	const { userId } = params;

	// Prevent self-update
	if (userId === user.id) {
		error(400, 'Cannot update your own role');
	}

	try {
		const body = await request.json();
		const validatedData = updateUserRoleSchema.parse(body);
		const result: PublicUser = await userService.updateUserRole(
			userId,
			user.organization_id,
			validatedData,
			user.id
		);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error updating user role:', err);
		error(500, 'Failed to update user role');
	}
};

// DELETE /api/auth/users/[userId] - Delete a user
export const DELETE: RequestHandler = async ({ params }): Promise<Response> => {
	const user = requirePermissionApi('users:delete');

	const { userId } = params;

	// Prevent self-deletion
	if (userId === user.id) {
		error(400, 'Cannot delete your own account');
	}

	try {
		const result: { success: true } = await userService.deleteUser(userId, user.organization_id);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error deleting user:', err);
		error(500, 'Failed to delete user');
	}
};
