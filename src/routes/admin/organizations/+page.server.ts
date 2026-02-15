import { getOrgPlan } from '$lib/server/db/schema';
import { adminService } from '$lib/services/server/admin.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const organizations = await adminService.getAllOrganizations();

	return {
		organizations: organizations.map((org) => ({
			...org,
			plan: getOrgPlan(org)
		}))
	};
};
