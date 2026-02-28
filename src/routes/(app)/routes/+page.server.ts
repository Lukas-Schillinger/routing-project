import { routeService } from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
	const user = requirePermission('routes:read');
	depends(INVALIDATION_KEYS.ROUTES);

	const routes = await routeService.getRoutesForUser(user);

	return { routes };
};
