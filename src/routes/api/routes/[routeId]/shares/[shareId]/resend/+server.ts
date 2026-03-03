// POST /api/routes/[routeId]/shares/[shareId]/resend - Resend a share email

import { handleApiError, ServiceError } from '$lib/errors';
import { routeShareService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, url }) => {
	const user = requirePermissionApi('resources:create');

	const { routeId, shareId } = params;
	if (!routeId || !shareId) {
		throw ServiceError.badRequest('Route ID and Share ID are required');
	}

	try {
		const share = await routeShareService.resendEmailShare(
			shareId,
			user.organization_id,
			user.id,
			url.origin
		);

		return json(share, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to resend route share');
	}
};
