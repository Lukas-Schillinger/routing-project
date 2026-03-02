import { handleApiError } from '$lib/errors';
import { createTestAccountSchema } from '$lib/schemas';
import { requireAdminApi } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	requireAdminApi();

	try {
		const body = await request.json();
		const data = createTestAccountSchema.parse(body);

		const result = await adminService.createTestAccount(data);

		return json({
			success: true,
			organization: result.organization,
			user: result.user
		});
	} catch (err) {
		handleApiError(err, 'Failed to create test account');
	}
};
