// POST /api/billing/upgrade - Create Stripe Checkout session for Pro upgrade

import { handleApiError } from '$lib/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ url }) => {
	const user = requirePermissionApi('billing:update');

	try {
		const checkoutUrl = await subscriptionService.createUpgradeCheckout(
			user.organization_id,
			user.email,
			url.origin
		);

		return json(checkoutUrl);
	} catch (err) {
		handleApiError(err, 'Failed to create upgrade checkout session');
	}
};
