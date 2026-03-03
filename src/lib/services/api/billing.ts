import type { CreditPurchaseInput } from '$lib/schemas/billing';
import { apiClient } from './base';

class BillingApiService {
	/**
	 * Create Stripe Checkout session for upgrading to Pro
	 */
	async createUpgradeCheckout(): Promise<string> {
		return apiClient.post<string>('/billing/upgrade');
	}

	/**
	 * Schedule downgrade to Free at end of billing period
	 */
	async scheduleDowngrade(): Promise<string> {
		return apiClient.post<string>('/billing/downgrade');
	}

	/**
	 * Cancel a scheduled downgrade, keeping Pro
	 */
	async cancelScheduledDowngrade(): Promise<void> {
		await apiClient.delete('/billing/downgrade');
	}

	/**
	 * Create Stripe Billing Portal session for managing payment methods
	 */
	async createPortalSession(flow?: 'payment_method_update'): Promise<string> {
		return apiClient.post<string>('/billing/portal', flow ? { flow } : {});
	}

	/**
	 * Create Stripe Checkout session for purchasing credits
	 * @param data.amount - Number of credits to purchase
	 * @param data.returnUrl - Optional URL to redirect to after checkout (defaults to /maps)
	 */
	async createCreditsCheckout(data: CreditPurchaseInput): Promise<string> {
		return apiClient.post<string>('/billing/checkout/credits', data);
	}
}

// Singleton instance
export const billingApi = new BillingApiService();
