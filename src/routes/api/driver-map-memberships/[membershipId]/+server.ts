// GET /api/driver-map-memberships/[membershipId] - Get a specific membership
// DELETE /api/driver-map-memberships/[membershipId] - Delete a membership

import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, maps } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { membershipId } = params;

	try {
		const [membership] = await db
			.select({
				id: driverMapMemberships.id,
				organization_id: driverMapMemberships.organization_id,
				driver_id: driverMapMemberships.driver_id,
				map_id: driverMapMemberships.map_id,
				created_at: driverMapMemberships.created_at,
				updated_at: driverMapMemberships.updated_at,
				driver: {
					id: drivers.id,
					name: drivers.name,
					phone: drivers.phone,
					notes: drivers.notes,
					active: drivers.active,
					temporary: drivers.temporary
				},
				map: {
					id: maps.id,
					title: maps.title
				}
			})
			.from(driverMapMemberships)
			.leftJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
			.leftJoin(maps, eq(driverMapMemberships.map_id, maps.id))
			.where(
				and(
					eq(driverMapMemberships.id, membershipId),
					eq(driverMapMemberships.organization_id, user.organization_id)
				)
			)
			.limit(1);

		if (!membership) {
			error(404, 'Membership not found');
		}

		return json(membership);
	} catch (err) {
		console.error('Error fetching driver-map membership:', err);
		error(500, 'Failed to fetch driver-map membership');
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { membershipId } = params;

	try {
		// Verify membership exists and belongs to organization
		const [membership] = await db
			.select()
			.from(driverMapMemberships)
			.where(
				and(
					eq(driverMapMemberships.id, membershipId),
					eq(driverMapMemberships.organization_id, user.organization_id)
				)
			)
			.limit(1);

		if (!membership) {
			error(404, 'Membership not found');
		}

		await db
			.delete(driverMapMemberships)
			.where(
				and(
					eq(driverMapMemberships.id, membershipId),
					eq(driverMapMemberships.organization_id, user.organization_id)
				)
			);

		return json({ success: true, message: 'Membership deleted successfully' });
	} catch (err) {
		console.error('Error deleting driver-map membership:', err);
		error(500, 'Failed to delete driver-map membership');
	}
};
