import type { CreditPurchaseInput } from '$lib/schemas/billing';
import { apiClient } from './base';

type CheckoutResponse = { url: string };

class BillingApiService {
	/**
	 * Create Stripe Checkout session for upgrading to Pro
	 */
	async createUpgradeCheckout(): Promise<CheckoutResponse> {
		return apiClient.post<CheckoutResponse>('/billing/upgrade');
	}

	/**
	 * Schedule downgrade to Free at end of billing period
	 */
	async scheduleDowngrade(): Promise<{ effectiveDate: string }> {
		return apiClient.post<{ effectiveDate: string }>('/billing/downgrade');
	}

	/**
	 * Cancel a scheduled downgrade, keeping Pro
	 */
	async cancelScheduledDowngrade(): Promise<void> {
		await apiClient.delete('/billing/downgrade');
	}

	/**
	 * Create Stripe Checkout session for purchasing credits
	 * @param data.amount - Number of credits to purchase
	 * @param data.returnUrl - Optional URL to redirect to after checkout (defaults to /maps)
	 */
	async createCreditsCheckout(
		data: CreditPurchaseInput
	): Promise<CheckoutResponse> {
		return apiClient.post<CheckoutResponse>('/billing/checkout/credits', data);
	}
}

// Singleton instance
export const billingApi = new BillingApiService();
