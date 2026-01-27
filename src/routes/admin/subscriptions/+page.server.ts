import { adminService } from '$lib/services/server/admin.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const subscriptions = await adminService.getAllSubscriptions();
	return { subscriptions };
};
