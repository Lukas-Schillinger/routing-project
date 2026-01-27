import { handleApiError } from '$lib/errors';
import { requireAdminApi } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const syncSchema = z.object({
	organizationId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request }) => {
	requireAdminApi();

	try {
		const body = await request.json();
		const data = syncSchema.parse(body);

		await adminService.syncSubscriptionFromStripe(data.organizationId);

		return json({ success: true });
	} catch (err) {
		handleApiError(err, 'Failed to sync subscription from Stripe');
	}
};
