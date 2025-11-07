import { getUserOrRedirect } from '$lib/services/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = getUserOrRedirect(locals);

	return {
		user
	};
};
