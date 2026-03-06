import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

export const load = (async ({ locals }) => {
	requirePermission('resources:read');
	return {
		user: locals.user ?? null
	};
}) satisfies PageServerLoad;
