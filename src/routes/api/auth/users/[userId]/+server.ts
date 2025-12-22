// DELETE /api/auth/users/[userId] - Delete a user (admin only)

import { ServiceError } from '$lib/services/server/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { userService } from '$lib/services/server/user.service';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('users:delete');

	const { userId } = params;

	// Prevent self-deletion
	if (userId === user.id) {
		error(400, 'Cannot delete your own account');
	}

	try {
		const result = await userService.deleteUser(userId, user.organization_id);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		console.error('Error deleting user:', err);
		error(500, 'Failed to delete user');
	}
};
