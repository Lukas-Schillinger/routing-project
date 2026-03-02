import type {
	AdjustCreditsInput,
	CreateTestAccountInput
} from '$lib/schemas/admin';
import { apiClient } from './base';

type CreateAccountResponse = {
	success: boolean;
	organization: { id: string };
	user: { id: string };
};

type ImpersonateResponse = {
	success: boolean;
	redirectUrl: string;
};

type AdjustCreditsApiInput = AdjustCreditsInput & { organizationId: string };

type SuccessResponse = { success: boolean };

class AdminApiService {
	/**
	 * Create a test account with a new organization
	 */
	async createTestAccount(
		data: CreateTestAccountInput
	): Promise<CreateAccountResponse> {
		return apiClient.post<CreateAccountResponse>('/admin/accounts', data);
	}

	/**
	 * Start impersonating a user
	 */
	async startImpersonation(userId: string): Promise<ImpersonateResponse> {
		return apiClient.post<ImpersonateResponse>('/admin/impersonate/start', {
			userId
		});
	}

	/**
	 * Stop impersonating and return to admin session
	 */
	async stopImpersonation(): Promise<ImpersonateResponse> {
		return apiClient.post<ImpersonateResponse>('/admin/impersonate/stop');
	}

	/**
	 * Sync an organization's subscription state with Stripe
	 */
	async syncSubscription(organizationId: string): Promise<SuccessResponse> {
		return apiClient.post<SuccessResponse>('/admin/subscriptions/sync', {
			organizationId
		});
	}

	/**
	 * Adjust credits for an organization (adjustment or refund)
	 */
	async adjustCredits(data: AdjustCreditsApiInput): Promise<SuccessResponse> {
		return apiClient.post<SuccessResponse>('/admin/credits/adjust', data);
	}

	/**
	 * Permanently delete an organization and all its data
	 */
	async deleteOrganization(organizationId: string): Promise<SuccessResponse> {
		return apiClient.delete<SuccessResponse>(
			`/admin/organizations/${organizationId}`
		);
	}
}

export const adminApi = new AdminApiService();
