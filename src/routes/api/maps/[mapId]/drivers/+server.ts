// GET /api/maps/[mapId]/drivers - Get all drivers assigned to a map
// POST /api/maps/[mapId]/drivers - Assign a driver to a map

import { mapService, ServiceError } from '$lib/services/server';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { json } from '@sveltejs/kit';
import { ZodError } from 'zod';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');

	const mapId = params.mapId;
	if (!mapId) {
		return json({ error: 'Map ID is required' }, { status: 400 });
	}

	try {
		const memberships = await mapService.getDriversForMap(mapId, user.organization_id);

		return json({ memberships });
	} catch (error) {
		console.error('Error fetching driver memberships:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to fetch driver memberships' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	const user = requirePermissionApi('resources:create');

	const mapId = params.mapId;
	if (!mapId) {
		return json({ error: 'Map ID is required' }, { status: 400 });
	}

	try {
		const body = await request.json();
		const driverId = body.driver_id;

		if (!driverId || typeof driverId !== 'string') {
			return json({ error: 'driver_id is required' }, { status: 400 });
		}

		const membership = await mapService.addDriverToMap(driverId, mapId, user.organization_id);

		return json({ membership }, { status: 201 });
	} catch (error) {
		if (error instanceof ZodError) {
			const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
			return json({ error: `Validation error: ${errorMessages}` }, { status: 400 });
		}

		console.error('Error creating driver membership:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to create driver membership' }, { status: 500 });
	}
};
