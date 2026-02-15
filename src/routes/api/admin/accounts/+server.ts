import { handleApiError } from '$lib/errors';
import { adminService } from '$lib/services/server/admin.service';
import { requireAdminApi } from '$lib/services/server/admin';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const createAccountSchema = z.object({
	email: z.string().email(),
	name: z.string().max(200).optional(),
	organizationName: z.string().max(200).optional()
});

export const POST: RequestHandler = async ({ request }) => {
	requireAdminApi();

	try {
		const body = await request.json();
		const data = createAccountSchema.parse(body);

		const result = await adminService.createTestAccount({
			email: data.email,
			name: data.name,
			organizationName: data.organizationName
		});

		return json({
			success: true,
			organization: result.organization,
			user: result.user
		});
	} catch (err) {
		handleApiError(err, 'Failed to create test account');
	}
};
