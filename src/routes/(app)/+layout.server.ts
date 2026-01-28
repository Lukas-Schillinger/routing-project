import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user, // This will be null if not logged in
		isImpersonating: locals.isImpersonating
	};
};
