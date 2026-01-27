import { adminService } from '$lib/services/server/admin.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [transactions, organizations] = await Promise.all([
		adminService.getAllCreditTransactions(200),
		adminService.getAllOrganizations()
	]);

	return { transactions, organizations };
};
