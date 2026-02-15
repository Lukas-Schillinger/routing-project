// POST /api/billing/downgrade - Schedule downgrade to Free at period end
// DELETE /api/billing/downgrade - Cancel a scheduled downgrade

import { handleApiError } from '$lib/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	const user = requirePermissionApi('billing:update');

	try {
		const effectiveDate = await subscriptionService.scheduleDowngrade(
			user.organization_id
		);
		return json({ effectiveDate });
	} catch (err) {
		handleApiError(err, 'Failed to schedule downgrade');
	}
};

export const DELETE: RequestHandler = async () => {
	const user = requirePermissionApi('billing:update');

	try {
		await subscriptionService.cancelScheduledDowngrade(user.organization_id);
		return json({ ok: true });
	} catch (err) {
		handleApiError(err, 'Failed to cancel scheduled downgrade');
	}
};
