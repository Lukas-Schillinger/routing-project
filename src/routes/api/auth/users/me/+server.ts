// PATCH /api/auth/users/me - Update current user's profile

import { handleApiError } from '$lib/errors';
import { updateUserSchema } from '$lib/schemas';
import { requireAuth } from '$lib/services/server/permissions';
import { userService } from '$lib/services/server/user.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request }) => {
	const user = requireAuth();

	try {
		const body = await request.json();
		const validatedData = updateUserSchema.parse(body);

		const updatedUser = await userService.updateUser(user.id, user.organization_id, validatedData);

		return json(updatedUser);
	} catch (err) {
		handleApiError(err, 'Failed to update user');
	}
};
