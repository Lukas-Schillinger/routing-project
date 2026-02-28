import { requireAdmin } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, depends }) => {
	requireAdmin();
	depends(INVALIDATION_KEYS.ADMIN);
	const [orgDetail, stripeComparison] = await Promise.all([
		adminService.getOrganizationDetail(params.id),
		adminService.getSubscriptionWithStripeData(params.id)
	]);

	return {
		...orgDetail,
		stripeComparison
	};
};
