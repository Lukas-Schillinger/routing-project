import type {
	CreateMagicInvite,
	CreateMagicLogin,
	MagicInvite,
	MagicLogin,
	Organization,
	PublicUser,
	UpdateOrganization,
	UpdateUser,
	UpdateUserRole
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

class UsersApiService {
	async updateMe(data: UpdateUser): Promise<PublicUser> {
		return apiClient.patch<PublicUser>('/auth/users/me', data);
	}

	async updateRole(userId: string, data: UpdateUserRole): Promise<PublicUser> {
		return apiClient.patch<PublicUser>(`/auth/users/${userId}`, data);
	}

	async delete(userId: string): Promise<{ success: true }> {
		return apiClient.delete<{ success: true }>(`/auth/users/${userId}`);
	}
}

class OrganizationApiService {
	async update(organizationId: string, data: UpdateOrganization): Promise<Organization> {
		return apiClient.patch<Organization>(`/auth/organizations/${organizationId}`, data);
	}
}

// Singleton instance
export const magicLinksApi = new MagicApiService();
export const authApi = new AuthApiService();
export const organizationApi = new OrganizationApiService();
export const usersApi = new UsersApiService();
