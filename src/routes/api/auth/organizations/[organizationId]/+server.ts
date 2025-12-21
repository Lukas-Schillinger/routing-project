// PATCH /api/auth/organizations/[organizationId] - Update organization settings

import { updateOrganizationSchema } from '$lib/schemas';
import { ServiceError } from '$lib/services/server/errors';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { organizationService } from '$lib/services/server/user.service';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
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
		if (err instanceof ZodError) {
			const errorMessages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			error(400, `Validation error: ${errorMessages}`);
		}
		if (err instanceof ServiceError) {
			error(err.statusCode, err.message);
		}
		error(500, 'Failed to update organization');
	}
};
