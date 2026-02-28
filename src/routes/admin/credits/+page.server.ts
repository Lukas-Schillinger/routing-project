import { requireAdmin } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { INVALIDATION_KEYS } from '$lib/invalidation-keys';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ depends }) => {
	requireAdmin();
	depends(INVALIDATION_KEYS.ADMIN);
	const [transactions, organizations] = await Promise.all([
		adminService.getAllCreditTransactions(200),
		adminService.getAllOrganizations()
	]);

	return { transactions, organizations };
};
