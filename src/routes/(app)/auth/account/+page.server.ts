import { billingService } from '$lib/services/server/billing.service';
import { invitationService } from '$lib/services/server/invitation.service';
import { hasPermission, requireAuth } from '$lib/services/server/permissions';
import {
	organizationService,
	userService
} from '$lib/services/server/user.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const user = requireAuth();

	const hasBillingPermission = hasPermission(user.role, 'billing:read');
	const canManageUsers = hasPermission(user.role, 'users:update');

	// Fetch all data in parallel since they're independent
	const [
		organization,
		invitationsWithMailRecord,
		organizationUsers,
		subscriptionData,
		credits,
		transactions
	] = await Promise.all([
		organizationService.getOrganization(user.organization_id),
		canManageUsers
			? invitationService.getInvitationsWithMailRecord(user.organization_id)
			: null,
		userService.getPublicUsers(user.organization_id),
		hasBillingPermission
			? billingService.getSubscription(user.organization_id)
			: null,
		hasBillingPermission
			? billingService.getCreditBalance(user.organization_id)
			: null,
		hasBillingPermission
			? billingService.getTransactionHistory(user.organization_id, 50)
			: null
	]);

	return {
		organization,
		user,
		invitationsWithMailRecord,
		organizationUsers,
		billing: subscriptionData
			? {
					subscription: subscriptionData.subscription,
					plan: subscriptionData.plan,
					credits: credits!,
					transactions: transactions!
				}
			: null
	};
};
