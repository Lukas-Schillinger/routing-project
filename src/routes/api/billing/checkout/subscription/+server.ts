// POST /api/billing/checkout/subscription - Create checkout session for plan upgrade

import { handleApiError } from '$lib/errors';
import { upgradeCheckoutSchema } from '$lib/schemas/billing';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const user = requirePermissionApi('billing:update');

	try {
		const body = await request.json().catch(() => ({}));
		const { returnUrl } = upgradeCheckoutSchema.parse(body);

		const checkoutUrl = await subscriptionService.createUpgradeCheckoutSession(
			user.organization_id,
			user.email,
			url.origin,
			returnUrl
		);

		return json({ url: checkoutUrl });
	} catch (err) {
		handleApiError(err, 'Failed to create checkout session');
	}
};
