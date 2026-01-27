import { requireAdmin } from '$lib/services/server/admin';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const user = requireAdmin();
	return { user };
};
