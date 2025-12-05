// GET /api/depots - List all depots for the organization
// POST /api/depots - Create a new depot

import { updateOrganizationSchema } from '$lib/schemas';
import { authorizeRoute } from '$lib/services/server/auth';
import { ServiceError } from '$lib/services/server/errors';
import { organizationService } from '$lib/services/server/user.service';
import { error, json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request }) => {
	const user = authorizeRoute();

	const { organizationId } = params;

	try {
		const body = await request.json();
		const validatedData = updateOrganizationSchema.parse(body);

		const organization = await organizationService.updateOrganization(
			organizationId,
			validatedData,
			user.organization_id
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
