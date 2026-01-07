import { invitationService } from '$lib/services/server/invitation.service';
import { requireAuth } from '$lib/services/server/permissions';
import { organizationService, userService } from '$lib/services/server/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = requireAuth();

	// Fetch all data in parallel since they're independent
	const [organization, invitationsWithMailRecord, organizationUsers] = await Promise.all([
		organizationService.getOrganization(user.organization_id),
		invitationService.getInvitationsWithMailRecord(user.organization_id),
		userService.getPublicUsers(user.organization_id)
	]);

	return {
		organization: organization,
		user: user,
		invitationsWithMailRecord: invitationsWithMailRecord,
		organizationUsers: organizationUsers
	};
};
