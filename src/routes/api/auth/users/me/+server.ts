// /api/auth/users/me - Current user operations

import { handleApiError } from '$lib/errors';
import { updateUserSchema } from '$lib/schemas';
import {
	requireAuth,
	requirePermissionApi
} from '$lib/services/server/permissions';
import { userService } from '$lib/services/server/user.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PATCH /api/auth/users/me - Update current user's profile
export const PATCH: RequestHandler = async ({ request }) => {
	const user = requireAuth();

	try {
		const body = await request.json();
		const validatedData = updateUserSchema.parse(body);

		const updatedUser = await userService.updateUser(
			user.id,
			user.organization_id,
			validatedData
		);

		return json(updatedUser);
	} catch (err) {
		handleApiError(err, 'Failed to update user');
	}
};

// DELETE /api/auth/users/me - Delete current user's account (admin only)
export const DELETE: RequestHandler = async () => {
	const user = requirePermissionApi('users:delete');

	try {
		await userService.deleteUser(user.id, user.organization_id);
		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to delete account');
	}
};
