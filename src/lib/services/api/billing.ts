import type { CreditPurchaseInput } from '$lib/schemas/billing';
import { apiClient } from './base';

type CheckoutResponse = { url: string };

class BillingApiService {
	/**
	 * Create Stripe Checkout session for upgrading to Pro plan
	 */
	async createUpgradeCheckout(): Promise<CheckoutResponse> {
		return apiClient.post<CheckoutResponse>('/billing/checkout/subscription');
	}

	/**
	 * Create Stripe Checkout session for purchasing credits
	 */
	async createCreditsCheckout(
		data: CreditPurchaseInput
	): Promise<CheckoutResponse> {
		return apiClient.post<CheckoutResponse>('/billing/checkout/credits', data);
	}

	/**
	 * Create Stripe billing portal session for self-service management
	 */
	async createPortalSession(): Promise<CheckoutResponse> {
		return apiClient.post<CheckoutResponse>('/billing/portal');
	}
}

// Singleton instance
export const billingApi = new BillingApiService();
