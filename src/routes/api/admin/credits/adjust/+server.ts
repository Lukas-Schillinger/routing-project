import { handleApiError } from '$lib/errors';
import { requireAdminApi } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const adjustCreditsSchema = z.object({
	organizationId: z.string().uuid(),
	amount: z.number().int(),
	type: z.enum(['adjustment', 'refund']),
	description: z.string().min(1)
});

export const POST: RequestHandler = async ({ request }) => {
	requireAdminApi();

	try {
		const body = await request.json();
		const data = adjustCreditsSchema.parse(body);

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
