import { getUserOrRedirect } from '$lib/services/server/auth';
import { magicLinkService } from '$lib/services/server/magic-link.service';
import { organizationService } from '$lib/services/server/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = getUserOrRedirect(locals);

	// Fetch all data in parallel since they're independent
	const [organization, magicInvites] = await Promise.all([
		organizationService.getOrganization(user.organization_id, user.organization_id),
		magicLinkService.getMagicInvites(user.organization_id)
	]);

	return {
		organization: organization,
		user: user,
		magicInvites: magicInvites
	};
};
