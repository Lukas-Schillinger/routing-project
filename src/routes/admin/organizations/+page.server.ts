import { adminService } from '$lib/services/server/admin.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [organizations, subscriptions] = await Promise.all([
		adminService.getAllOrganizations(),
		adminService.getAllSubscriptions()
	]);

	// Create a map of org ID to subscription info for easy lookup
	const subscriptionMap = new Map(
		subscriptions.map((s) => [
			s.subscription.organization_id,
			{ plan: s.plan, status: s.subscription.status }
		])
	);

	return {
		organizations: organizations.map((org) => ({
			...org,
			subscription: subscriptionMap.get(org.id) ?? null
		}))
	};
};
