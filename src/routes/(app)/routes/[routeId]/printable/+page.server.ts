import {
	routeService,
	routeShareService,
	ServiceError
} from '$lib/services/server';
import { requirePermission } from '$lib/services/server/permissions';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	try {
		// 1. Check if route is public (temp driver) - no auth required
		const publicRoute = await routeService.getPublicRoute(params.routeId);
		if (publicRoute) {
			return await routeService.getRouteWithDetails(
				params.routeId,
				publicRoute.organization_id
			);
		}

		// 2. Check for valid share token in URL
		const token = url.searchParams.get('token');
		if (token) {
			const routeWithDetails =
				await routeShareService.validateTokenAndGetRoute(token);
			if (routeWithDetails) {
				return routeWithDetails;
			}
			// Invalid/expired token - fall through to require auth
		}

		// 3. Require authentication
		const user = requirePermission('routes:read');
		return await routeService.getRouteWithDetails(
			params.routeId,
			user.organization_id
		);
	} catch (err) {
		if (err instanceof ServiceError) {
			throw error(err.statusCode, { code: err.code, message: err.message });
		}
		throw err;
	}
};
