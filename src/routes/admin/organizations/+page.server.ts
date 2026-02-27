import { getOrgPlan } from '$lib/server/db/schema';
import { requireAdmin } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	requireAdmin();
	const organizations = await adminService.getAllOrganizations();

	return {
		organizations: organizations.map((org) => ({
			...org,
			plan: getOrgPlan(org)
		}))
	};
};
