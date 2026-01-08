import type {
	CreateEmailShare,
	RouteShareWithMailRecord
} from '$lib/schemas/route-share';
import { apiClient } from './base';

class RouteShareApiService {
	/**
	 * Get all shares for a route
	 */
	async getSharesForRoute(
		routeId: string
	): Promise<RouteShareWithMailRecord[]> {
		return apiClient.get<RouteShareWithMailRecord[]>(
			`/routes/${routeId}/shares`
		);
	}

	/**
	 * Create a new email share for a route
	 */
	async createEmailShare(
		routeId: string,
		data: CreateEmailShare
	): Promise<{ share: RouteShareWithMailRecord }> {
		return apiClient.post<{ share: RouteShareWithMailRecord }>(
			`/routes/${routeId}/shares`,
			data
		);
	}

	/**
	 * Revoke a share
	 */
	async revokeShare(
		routeId: string,
		shareId: string
	): Promise<{ success: boolean }> {
		return apiClient.post<{ success: boolean }>(
			`/routes/${routeId}/shares/${shareId}/revoke`
		);
	}

	/**
	 * Delete a share
	 */
	async deleteShare(
		routeId: string,
		shareId: string
	): Promise<{ success: boolean }> {
		return apiClient.delete<{ success: boolean }>(
			`/routes/${routeId}/shares/${shareId}`
		);
	}

	/**
	 * Resend a share email
	 */
	async resendShare(
		routeId: string,
		shareId: string
	): Promise<{ share: RouteShareWithMailRecord }> {
		return apiClient.post<{ share: RouteShareWithMailRecord }>(
			`/routes/${routeId}/shares/${shareId}/resend`
		);
	}
}

export const routeShareApi = new RouteShareApiService();
