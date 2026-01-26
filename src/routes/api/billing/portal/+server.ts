// POST /api/billing/portal - Create Stripe billing portal session

import { handleApiError } from '$lib/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ url }) => {
	const user = requirePermissionApi('billing:update');

	try {
		const portalUrl = await subscriptionService.createBillingPortalSession(
			user.organization_id,
			url.origin,
			'/auth/account'
		);

		return json({ url: portalUrl });
	} catch (err) {
		handleApiError(err, 'Failed to create billing portal session');
	}
};
