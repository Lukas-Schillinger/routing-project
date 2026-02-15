import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import Stripe from 'stripe';

const log = logger.child({ service: 'stripe' });

class StripeClient {
	private _stripe: Stripe | null = null;

	private get stripe(): Stripe {
		if (!this._stripe) {
			const secretKey = env.STRIPE_SECRET_KEY;
			if (!secretKey) {
				throw new Error(
					'Stripe secret key is required. Set STRIPE_SECRET_KEY environment variable.'
				);
			}
			this._stripe = new Stripe(secretKey);
		}
		return this._stripe;
	}

	/**
	 * Create a Stripe customer for an organization.
	 */
	async createCustomer(
		organizationId: string,
		email: string
	): Promise<Stripe.Customer> {
		log.info({ organizationId }, 'Creating Stripe customer');
		return this.stripe.customers.create({
			email,
			metadata: { organization_id: organizationId }
		});
	}

	/**
	 * Create a Checkout Session (for subscriptions or credit purchases).
	 */
	async createCheckoutSession(
		params: Stripe.Checkout.SessionCreateParams
	): Promise<Stripe.Checkout.Session> {
		log.info({ mode: params.mode }, 'Creating Stripe Checkout session');
		return this.stripe.checkout.sessions.create(params);
	}

	/**
	 * Retrieve a subscription.
	 */
	async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
		return this.stripe.subscriptions.retrieve(subscriptionId);
	}

	/**
	 * Update a subscription (e.g., cancel_at_period_end).
	 */
	async updateSubscription(
		subscriptionId: string,
		params: Stripe.SubscriptionUpdateParams
	): Promise<Stripe.Subscription> {
		log.info({ subscriptionId }, 'Updating Stripe subscription');
		return this.stripe.subscriptions.update(subscriptionId, params);
	}

	/**
	 * Cancel a subscription immediately (for admin use).
	 */
	async cancelSubscription(
		subscriptionId: string
	): Promise<Stripe.Subscription> {
		log.info({ subscriptionId }, 'Canceling Stripe subscription');
		return this.stripe.subscriptions.cancel(subscriptionId);
	}

	/**
	 * Create a Billing Portal session for managing subscriptions/payment methods.
	 */
	async createPortalSession(
		params: Stripe.BillingPortal.SessionCreateParams
	): Promise<Stripe.BillingPortal.Session> {
		log.info('Creating Stripe Billing Portal session');
		return this.stripe.billingPortal.sessions.create(params);
	}

	/**
	 * Construct and verify a webhook event from the raw body and signature.
	 */
	constructWebhookEvent(
		payload: string | Buffer,
		signature: string,
		webhookSecret: string
	): Stripe.Event {
		return this.stripe.webhooks.constructEvent(
			payload,
			signature,
			webhookSecret
		);
	}
}

// Export singleton instance
export const stripeClient = new StripeClient();
