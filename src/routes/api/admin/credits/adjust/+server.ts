import { handleApiError } from '$lib/errors';
import { adjustCreditsSchema } from '$lib/schemas';
import { requireAdminApi } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const adjustCreditsApiSchema = adjustCreditsSchema.extend({
	organizationId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request }) => {
	requireAdminApi();

	try {
		const body = await request.json();
		const data = adjustCreditsApiSchema.parse(body);

		await adminService.adjustCredits(
			data.organizationId,
			data.amount,
			data.type,
			data.description
		);

		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to adjust credits');
	}
};
