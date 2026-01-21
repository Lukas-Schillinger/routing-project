// POST /api/billing/checkout/subscription - Create checkout session for plan upgrade

import { handleApiError } from '$lib/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ url }) => {
	const user = requirePermissionApi('billing:update');

	try {
		const checkoutUrl = await subscriptionService.createUpgradeCheckoutSession(
			user.organization_id,
			url.origin
		);

		return json({ url: checkoutUrl });
	} catch (err) {
		handleApiError(err, 'Failed to create checkout session');
	}
};
