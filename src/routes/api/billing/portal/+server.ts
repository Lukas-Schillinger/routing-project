// POST /api/billing/portal - Create Stripe Billing Portal session

import { handleApiError } from '$lib/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const portalBodySchema = z.object({
	flow: z.literal('payment_method_update').optional()
});

export const POST: RequestHandler = async ({ url, request }) => {
	const user = requirePermissionApi('billing:update');

	try {
		const body = await request.json().catch(() => ({}));
		const { flow } = portalBodySchema.parse(body);

		const portalUrl = await subscriptionService.createPortalSession(
			user.organization_id,
			url.origin,
			flow
		);

		return json(portalUrl);
	} catch (err) {
		handleApiError(err, 'Failed to create billing portal session');
	}
};
