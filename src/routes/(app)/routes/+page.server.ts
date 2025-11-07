import { routeService } from '$lib/services/server';
import { getUserOrRedirect } from '$lib/services/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = getUserOrRedirect();

	const routes = await routeService.getRoutes(user.organization_id);

	return { routes };
};
