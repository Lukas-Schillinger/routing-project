// POST /api/routes/[routeId]/shares/[shareId]/resend - Resend a share email

import { routeShareService, ServiceError } from '$lib/services/server';
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
	} catch (error) {
		console.error('Error resending route share:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to resend route share' }, { status: 500 });
	}
};
