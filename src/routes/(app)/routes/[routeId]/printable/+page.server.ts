import { routeService, ServiceError } from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		// Check if route is public (temp driver) - quick check, no auth required
		const publicRoute = await routeService.getPublicRoute(params.routeId);

		// Determine org ID: from public route or authenticated user
		const organizationId = publicRoute?.organization_id
			?? requirePermission('routes:read').organization_id;

		return await routeService.getRouteWithDetails(params.routeId, organizationId);
	} catch (err) {
		if (err instanceof ServiceError) {
			throw error(err.statusCode, err.message);
		}
		throw err;
	}
};
