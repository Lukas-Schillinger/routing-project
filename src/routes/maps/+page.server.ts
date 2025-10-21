import { db } from '$lib/server/db';
import { maps, stops } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { count, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/demo/lucia/login');
	}

	// Fetch all maps for the user's organization
	const userMaps = await db
		.select({
			id: maps.id,
			title: maps.title,
			created_at: maps.created_at,
			updated_at: maps.updated_at,
			numStops: count(stops.id)
		})
		.from(maps)
		.leftJoin(stops, eq(stops.map_id, maps.id))
		.where(eq(maps.organization_id, user.organization_id))
		.groupBy(maps.id, maps.title, maps.created_at, maps.updated_at)
		.orderBy(desc(maps.created_at));

	return {
		maps: userMaps
	};
};
