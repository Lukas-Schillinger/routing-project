// GET /api/routes/[routeId]/shares - Get all shares for a route
// POST /api/routes/[routeId]/shares - Create a new email share

import { handleApiError } from '$lib/errors';
import { createEmailShareSchema } from '$lib/schemas/route-share';
import { routeShareService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { getRequestEvent } from '$app/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	const routeId = params.routeId;
	if (!routeId) {
		return json({ error: 'Route ID is required' }, { status: 400 });
	}

	try {
		const shares = await routeShareService.getSharesForRoute(routeId, user.organization_id);
		return json({ shares });
	} catch (err) {
		handleApiError(err, 'Failed to fetch route shares');
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:create');

	const routeId = params.routeId;
	if (!routeId) {
		return json({ error: 'Route ID is required' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const validated = createEmailShareSchema.parse({ ...body, route_id: routeId });

		const event = getRequestEvent();
		const origin = event?.url.origin ?? '';

		const share = await routeShareService.createAndSendEmailShare(
			routeId,
			validated.recipient_email,
			user.organization_id,
			user.id,
			origin
		);

		return json({ share }, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to create route share');
	}
};
