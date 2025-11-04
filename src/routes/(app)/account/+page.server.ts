import { getUserOrRedirect } from '$lib/services/server/auth';
import { organizationService } from '$lib/services/server/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = getUserOrRedirect(locals);

	// Fetch all data in parallel since they're independent
	const [organization] = await Promise.all([
		organizationService.getOrganization(user.organization_id, user.organization_id)
	]);

	return {
		organization: organization,
		user: user
	};
};
