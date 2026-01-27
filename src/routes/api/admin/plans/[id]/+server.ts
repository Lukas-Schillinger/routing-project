import { handleApiError } from '$lib/errors';
import { requireAdminApi } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const updatePlanSchema = z.object({
	monthly_credits: z.number().int().min(0).optional(),
	features: z
		.object({
			fleet_management: z.boolean()
		})
		.optional()
});

export const PATCH: RequestHandler = async ({ request, params }) => {
	requireAdminApi();

	try {
		const body = await request.json();
		const data = updatePlanSchema.parse(body);

		const updatedPlan = await adminService.updatePlan(params.id, data);

		return json(updatedPlan);
	} catch (err) {
		handleApiError(err, 'Failed to update plan');
	}
};
