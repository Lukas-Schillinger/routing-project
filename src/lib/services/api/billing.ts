import type { CreditPurchaseInput } from '$lib/schemas/billing';
import { apiClient } from './base';

type CheckoutResponse = { url: string };

class BillingApiService {
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

	/**
	 * Create Stripe billing portal session for self-service management
	 */
	async createPortalSession(): Promise<CheckoutResponse> {
		return apiClient.post<CheckoutResponse>('/billing/portal');
	}
}

// Singleton instance
export const billingApi = new BillingApiService();
