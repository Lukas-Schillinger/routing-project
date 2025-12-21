import { createStopSchema } from '$lib/schemas/stop';
import { stopService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { error } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

/**
 * POST /api/stops
 * Create a new stop
 */
export const POST: RequestHandler = async ({ request }) => {
	const user = requirePermissionApi('resources:create');

	try {
		const body = await request.json();
		const validatedData = createStopSchema.parse(body);

		const stop = await stopService.createStop(validatedData, user.organization_id, user.id);

		return new Response(JSON.stringify(stop), {
			status: 201,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (err) {
		if (err instanceof ZodError) {
			error(400, `Validation error: ${err.errors.map((e) => e.message).join(', ')}`);
		}

		throw err;
	}
};
