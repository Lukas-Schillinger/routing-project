// POST /api/routes/[routeId]/shares/[shareId]/resend - Resend a share email

import { handleApiError } from '$lib/errors';
import { routeShareService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { getRequestEvent } from '$app/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:create');

	const { routeId, shareId } = params;
	if (!routeId || !shareId) {
		return json({ error: 'Route ID and Share ID are required' }, { status: 400 });
	}

	try {
		const event = getRequestEvent();
		const origin = event?.url.origin ?? '';

		const share = await routeShareService.resendEmailShare(
			shareId,
			user.organization_id,
			user.id,
			origin
		);

		return json({ share }, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to resend route share');
	}
};
