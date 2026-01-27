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
	 * Email is set at creation for checkout prefill. Update it if user changes email.
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
	 * Update a customer's details
	 */
	async updateCustomer(
		customerId: string,
		params: Stripe.CustomerUpdateParams
	): Promise<Stripe.Customer> {
		return this.stripe.customers.update(customerId, params);
	}

	/**
	 * Create a subscription for a customer
	 */
	async createSubscription(params: {
		customerId: string;
		priceId: string;
		organizationId: string;
	}): Promise<Stripe.Subscription> {
		log.info(
			{ customerId: params.customerId, organizationId: params.organizationId },
			'Creating Stripe subscription'
		);
		return this.stripe.subscriptions.create({
			customer: params.customerId,
			items: [{ price: params.priceId }],
			metadata: { organization_id: params.organizationId }
		});
	}

	/**
	 * Update a subscription (e.g., for plan changes)
	 */
	async updateSubscription(
		subscriptionId: string,
		params: Stripe.SubscriptionUpdateParams
	): Promise<Stripe.Subscription> {
		log.info({ subscriptionId }, 'Updating Stripe subscription');
		return this.stripe.subscriptions.update(subscriptionId, params);
	}

	/**
	 * Retrieve a subscription
	 */
	async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
		return this.stripe.subscriptions.retrieve(subscriptionId);
	}

	/**
	 * Create a Checkout Session for subscription upgrade
	 */
	async createCheckoutSession(
		params: Stripe.Checkout.SessionCreateParams
	): Promise<Stripe.Checkout.Session> {
		log.info({ mode: params.mode }, 'Creating Stripe Checkout session');
		return this.stripe.checkout.sessions.create(params);
	}

	/**
	 * Construct and verify a webhook event from the raw body and signature
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

	/**
	 * Retrieve a customer
	 */
	async getCustomer(
		customerId: string
	): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
		return this.stripe.customers.retrieve(customerId);
	}

	/**
	 * Create a billing portal session for self-service management
	 */
	async createBillingPortalSession(params: {
		customer: string;
		return_url: string;
	}): Promise<Stripe.BillingPortal.Session> {
		log.info({ customer: params.customer }, 'Creating billing portal session');
		return this.stripe.billingPortal.sessions.create(params);
	}

	/**
	 * Create a subscription schedule from an existing subscription.
	 * This allows scheduling plan changes at the end of the current period.
	 */
	async createSubscriptionSchedule(
		subscriptionId: string
	): Promise<Stripe.SubscriptionSchedule> {
		log.info({ subscriptionId }, 'Creating subscription schedule');
		return this.stripe.subscriptionSchedules.create({
			from_subscription: subscriptionId
		});
	}

	/**
	 * Update a subscription schedule with new phases.
	 */
	async updateSubscriptionSchedule(
		scheduleId: string,
		params: Stripe.SubscriptionScheduleUpdateParams
	): Promise<Stripe.SubscriptionSchedule> {
		log.info({ scheduleId }, 'Updating subscription schedule');
		return this.stripe.subscriptionSchedules.update(scheduleId, params);
	}

	/**
	 * Retrieve a subscription schedule.
	 */
	async getSubscriptionSchedule(
		scheduleId: string
	): Promise<Stripe.SubscriptionSchedule> {
		return this.stripe.subscriptionSchedules.retrieve(scheduleId);
	}

	/**
	 * Cancel/release a subscription schedule (keeps the subscription active
	 * but removes scheduled changes).
	 */
	async cancelSubscriptionSchedule(
		scheduleId: string
	): Promise<Stripe.SubscriptionSchedule> {
		log.info({ scheduleId }, 'Releasing subscription schedule');
		return this.stripe.subscriptionSchedules.release(scheduleId);
	}

	/**
	 * List all subscriptions for a customer
	 */
	async listCustomerSubscriptions(
		customerId: string
	): Promise<Stripe.Subscription[]> {
		const subscriptions = await this.stripe.subscriptions.list({
			customer: customerId,
			limit: 100
		});
		return subscriptions.data;
	}
}

// Export singleton instance
export const stripeClient = new StripeClient();
