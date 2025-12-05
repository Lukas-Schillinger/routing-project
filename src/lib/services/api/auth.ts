import type {
	CreateMagicInvite,
	CreateMagicLogin,
	MagicInvite,
	MagicLogin,
	UpdateOrganization
} from '$lib/schemas';
import { apiClient } from './base';

class MagicApiService {
	async deleteInvite(magicLinkId: string): Promise<{ success: true }> {
		return apiClient.delete<{ success: true }>(`/auth/magic/${magicLinkId}`);
	}

	/**
	 * Request a magic link to be sent via email
	 */
	async requestInvite(data: CreateMagicInvite): Promise<MagicInvite> {
		return apiClient.post<MagicInvite>('/auth/magic/request', data);
	}

	async requestLogin(data: CreateMagicLogin): Promise<MagicLogin> {
		return apiClient.post<MagicLogin>('/auth/magic/request', data);
	}
}

class AuthApiService {
	async logout() {
		return apiClient.post<{ success: true }>('/auth/logout');
	}
}

class OrganizationApiService {
	async updateMapSchema(requestedId: string, data: UpdateOrganization) {
		return apiClient.patch(`/auth/organizations/${requestedId}`, data);
	}
}

// Singleton instance
export const magicLinksApi = new MagicApiService();
export const authApi = new AuthApiService();
export const organizationApi = new OrganizationApiService();
