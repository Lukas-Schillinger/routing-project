import { magicLinkService } from '$lib/services/server/magic-link.service';
import { requireAuth } from '$lib/services/server/permissions';
import { organizationService, userService } from '$lib/services/server/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = requireAuth();

	// Fetch all data in parallel since they're independent
	const [organization, magicInvites, orginizationUsers] = await Promise.all([
		organizationService.getOrganization(user.organization_id, user.organization_id),
		magicLinkService.getMagicInvites(user.organization_id),
		userService.getPublicUsers(user.organization_id)
	]);

	return {
		organization: organization,
		user: user,
		magicInvites: magicInvites,
		organizationUsers: orginizationUsers
	};
};
