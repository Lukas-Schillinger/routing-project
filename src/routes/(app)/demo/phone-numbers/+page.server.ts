import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	requirePermission('resources:read');
	return {};
}) satisfies PageServerLoad;
