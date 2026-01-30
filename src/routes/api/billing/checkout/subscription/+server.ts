// POST /api/billing/checkout/subscription - Upgrade subscription to Pro plan

import { handleApiError } from '$lib/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const user = requirePermissionApi('billing:update');

	try {
		const body = await request.json().catch(() => ({}));
		const returnUrl =
			typeof body.returnUrl === 'string' ? body.returnUrl : undefined;

		const { url: checkoutUrl } = await subscriptionService.upgradeToProPlan(
			user.organization_id,
			url.origin,
			returnUrl
		);

		return json({ url: checkoutUrl });
	} catch (err) {
		handleApiError(err, 'Failed to upgrade subscription');
	}
};
