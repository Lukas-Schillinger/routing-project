import type {
	CreateInvitation,
	Invitation,
	Organization,
	PublicUser,
	UpdateOrganization,
	UpdateUser,
	UpdateUserRole
} from '$lib/schemas';
import { apiClient } from './base';

class InvitationsApiService {
	async createInvitation(data: CreateInvitation): Promise<Invitation> {
		return apiClient.post<Invitation>('/auth/invitations', data);
	}

	async deleteInvitation(invitationId: string): Promise<{ success: true }> {
		return apiClient.delete<{ success: true }>(
			`/auth/invitations/${invitationId}`
		);
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

	async deleteMe(): Promise<{ success: true }> {
		return apiClient.delete<{ success: true }>('/auth/users/me');
	}

	async updateRole(userId: string, data: UpdateUserRole): Promise<PublicUser> {
		return apiClient.patch<PublicUser>(`/auth/users/${userId}`, data);
	}

	async delete(userId: string): Promise<{ success: true }> {
		return apiClient.delete<{ success: true }>(`/auth/users/${userId}`);
	}
}

class OrganizationApiService {
	async update(
		organizationId: string,
		data: UpdateOrganization
	): Promise<Organization> {
		return apiClient.patch<Organization>(
			`/auth/organizations/${organizationId}`,
			data
		);
	}
}

// Singleton instances
export const invitationsApi = new InvitationsApiService();
export const authApi = new AuthApiService();
export const organizationApi = new OrganizationApiService();
export const usersApi = new UsersApiService();
