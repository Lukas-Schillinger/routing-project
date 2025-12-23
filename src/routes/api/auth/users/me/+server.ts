// PATCH /api/auth/users/me - Update current user's profile

import { updateUserSchema } from '$lib/schemas';
import { ServiceError } from '$lib/services/server/errors';
import { requireAuth } from '$lib/services/server/permissions';
import { userService } from '$lib/services/server/user.service';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request }) => {
	const user = requireAuth();

	try {
		const body = await request.json();
		const validatedData = updateUserSchema.parse(body);

		const updatedUser = await userService.updateUser(user.id, user.organization_id, validatedData);

		return json(updatedUser);
	} catch (err) {
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		error(500, 'Failed to update user');
	}
};
