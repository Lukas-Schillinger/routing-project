import { adminService } from '$lib/services/server/admin.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [orgDetail, stripeComparison] = await Promise.all([
		adminService.getOrganizationDetail(params.id),
		adminService.getSubscriptionWithStripeData(params.id).catch(() => null)
	]);

	return {
		...orgDetail,
		stripeComparison
	};
};
