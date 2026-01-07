// PATCH /api/auth/organizations/[organizationId] - Update organization settings

import { handleApiError } from '$lib/errors';
import { updateOrganizationSchema } from '$lib/schemas';
import { ServiceError } from '$lib/services/server/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { organizationService } from '$lib/services/server/user.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('users:update');

	const { organizationId } = params;

	// Security: users can only update their own organization
	if (organizationId !== user.organization_id) {
		throw ServiceError.forbidden('Cannot update other organizations');
	}

	try {
		const body = await request.json();
		const validatedData = updateOrganizationSchema.parse(body);

		const organization = await organizationService.updateOrganization(
			user.organization_id,
			validatedData,
			user.id
		);

		return json(organization);
	} catch (err) {
		handleApiError(err, 'Failed to update organization');
	}
};
