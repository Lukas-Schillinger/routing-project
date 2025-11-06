import type { CreateMagicInvite, CreateMagicLogin, MagicInvite, MagicLogin } from '$lib/schemas';
import { apiClient } from './base';

class MagicApiService {
	async deleteInvite(magicLinkId: string): Promise<{ success: true }> {
		return apiClient.delete<{ success: true }>(`/magic/${magicLinkId}`);
	}

	/**
	 * Request a magic link to be sent via email
	 */
	async requestInvite(data: CreateMagicInvite): Promise<MagicInvite> {
		return apiClient.post<MagicInvite>('/magic/request', data);
	}

	async requestLogin(data: CreateMagicLogin): Promise<MagicLogin> {
		return apiClient.post<MagicLogin>('/magic/request', data);
	}
}

// Singleton instance
export const magicLinksApi = new MagicApiService();
