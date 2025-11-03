import { routeService } from '$lib/services/server';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/demo/lucia/login');
	}

	const routes = await routeService.getRoutes(user.organization_id);

	return { routes };
};
