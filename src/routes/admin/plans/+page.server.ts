import { adminService } from '$lib/services/server/admin.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const plans = await adminService.getAllPlans();
	return { plans };
};
