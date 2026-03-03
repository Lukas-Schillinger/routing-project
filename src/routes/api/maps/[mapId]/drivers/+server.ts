// GET /api/maps/[mapId]/drivers - Get all drivers assigned to a map
// POST /api/maps/[mapId]/drivers - Assign a driver to a map

import { handleApiError } from '$lib/errors';
import { createDriverMapMembershipSchema } from '$lib/schemas/driverMapMembership';
import { mapService } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	try {
		const memberships = await mapService.getDriversForMap(
			params.mapId,
			user.organization_id
		);

		return json(memberships);
	} catch (err) {
		handleApiError(err, 'Failed to fetch driver memberships');
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:create');

	try {
		const body = await request.json();
		const { driver_id } = createDriverMapMembershipSchema
			.pick({ driver_id: true })
			.parse(body);

		const membership = await mapService.addDriverToMap(
			driver_id,
			params.mapId,
			user.organization_id
		);

		return json(membership, { status: 201 });
	} catch (err) {
		handleApiError(err, 'Failed to create driver membership');
	}
};
