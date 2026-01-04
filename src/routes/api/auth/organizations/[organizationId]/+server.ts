// PATCH /api/auth/organizations/[organizationId] - Update organization settings

import { handleApiError } from '$lib/errors';
import { updateOrganizationSchema } from '$lib/schemas';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { organizationService } from '$lib/services/server/user.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('users:update');

	const { organizationId } = params;

	try {
		const body = await request.json();
		const validatedData = updateOrganizationSchema.parse(body);

		const organization = await organizationService.updateOrganization(
			organizationId,
			validatedData,
			user.organization_id,
			user.id
		);

		return json(organization);
	} catch (err) {
		handleApiError(err, 'Failed to update organization');
	}
};
