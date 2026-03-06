import { handleApiError } from '$lib/errors';
import { requireAdminApi } from '$lib/services/server/admin';
import { adminService } from '$lib/services/server/admin.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	requireAdminApi();

	try {
		const result = await adminService.deleteOrganization(params.id);
		return json(result);
	} catch (err) {
		handleApiError(err, 'Failed to delete organization');
	}
};
