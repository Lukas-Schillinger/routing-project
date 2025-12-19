import { routeService } from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = requirePermission('routes:read');

	const routes = await routeService.getRoutesForUser(user);

	return { routes };
};
