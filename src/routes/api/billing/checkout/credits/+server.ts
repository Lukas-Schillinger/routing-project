// POST /api/billing/checkout/credits - Create checkout session for credit purchase

import { handleApiError } from '$lib/errors';
import { creditPurchaseSchema } from '$lib/schemas/billing';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const user = requirePermissionApi('billing:update');

	try {
		const body = await request.json();
		const { amount, returnUrl } = creditPurchaseSchema.parse(body);

		const checkoutUrl = await subscriptionService.createCreditPurchaseSession(
			user.organization_id,
			amount,
			url.origin,
			returnUrl
		);

		return json(checkoutUrl);
	} catch (err) {
		handleApiError(err, 'Failed to create checkout session');
	}
};
