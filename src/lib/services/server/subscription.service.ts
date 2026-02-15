import { billingConfig } from '$lib/config/billing';
import { db } from '$lib/server/db';
import { organizations, type SubscriptionStatus } from '$lib/server/db/schema';
import { stripeClient } from '$lib/services/external/stripe/client';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { ServiceError } from './errors';

type StripeClientType = typeof stripeClient;

export class SubscriptionService {
	private stripe: StripeClientType;

	constructor(stripe: StripeClientType = stripeClient) {
		this.stripe = stripe;
	}

	/**
	 * Create a Stripe Checkout session to upgrade to Pro.
	 * Creates a Stripe customer lazily if one doesn't exist.
	 */
	async createUpgradeCheckout(
		organizationId: string,
		adminEmail: string,
		origin: string
	): Promise<string> {
		const org = await this.getOrg(organizationId);

		if (org.subscription_status === 'active') {
			throw ServiceError.conflict('Already on Pro');
		}

		// Create Stripe customer lazily on first upgrade
		let customerId = org.stripe_customer_id;
		if (!customerId) {
			const customer = await this.stripe.createCustomer(
				organizationId,
				adminEmail
			);
			customerId = customer.id;
			await db
				.update(organizations)
				.set({ stripe_customer_id: customerId, updated_at: new Date() })
				.where(eq(organizations.id, organizationId));
		}

		const session = await this.stripe.createCheckoutSession({
			customer: customerId,
			mode: 'subscription',
			payment_method_types: ['card'],
			line_items: [{ price: billingConfig.proPlanPriceId, quantity: 1 }],
			success_url: `${origin}/auth/account?upgraded=true`,
			cancel_url: `${origin}/auth/account`,
			subscription_data: {
				metadata: { organization_id: organizationId }
			},
			metadata: {
				organization_id: organizationId,
				checkout_type: 'upgrade'
			}
		});

		if (!session.url) {
			throw ServiceError.internal('Failed to create checkout session URL');
		}

		return session.url;
	}

	/**
	 * Create a Stripe Checkout session for purchasing credits.
	 */
	async createCreditPurchaseSession(
		organizationId: string,
		creditAmount: number,
		origin: string,
		returnUrl?: string
	): Promise<string> {
		if (creditAmount < billingConfig.minCreditPurchase) {
			throw ServiceError.validation(
				`Minimum credit purchase is ${billingConfig.minCreditPurchase} credits`
			);
		}

		const org = await this.getOrg(organizationId);

		// Create Stripe customer lazily if needed
		const customerId = org.stripe_customer_id;
		if (!customerId) {
			throw ServiceError.badRequest(
				'No Stripe customer — upgrade to Pro first or contact support'
			);
		}

		const redirectUrl = `${origin}${returnUrl ?? '/maps'}`;

		const session = await this.stripe.createCheckoutSession({
			customer: customerId,
			mode: 'payment',
			payment_method_types: ['card'],
			line_items: [
				{
					price: billingConfig.creditPriceId,
					quantity: creditAmount
				}
			],
			success_url: redirectUrl,
			cancel_url: redirectUrl,
			metadata: {
				organization_id: organizationId,
				checkout_type: 'credits',
				credit_amount: creditAmount.toString()
			}
		});

		if (!session.url) {
			throw ServiceError.internal('Failed to create checkout session URL');
		}

		return session.url;
	}

	/**
	 * Sync organization billing fields from a Stripe subscription object.
	 */
	async syncSubscription(
		stripeSubscription: Stripe.Subscription
	): Promise<void> {
		const organizationId = stripeSubscription.metadata.organization_id;

		if (!organizationId) {
			throw ServiceError.badRequest(
				'Subscription metadata missing organization_id'
			);
		}

		const subscriptionItem = stripeSubscription.items.data[0];
		if (!subscriptionItem) {
			throw ServiceError.badRequest('Subscription has no items');
		}

		const customerId =
			typeof stripeSubscription.customer === 'string'
				? stripeSubscription.customer
				: stripeSubscription.customer?.id;

		await db
			.update(organizations)
			.set({
				stripe_customer_id: customerId ?? undefined,
				stripe_subscription_id: stripeSubscription.id,
				subscription_status: stripeSubscription.status as SubscriptionStatus,
				billing_period_starts_at: new Date(
					subscriptionItem.current_period_start * 1000
				),
				billing_period_ends_at: new Date(
					subscriptionItem.current_period_end * 1000
				),
				cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false,
				updated_at: new Date()
			})
			.where(eq(organizations.id, organizationId));
	}

	/**
	 * Clear subscription fields on an organization (org becomes Free).
	 */
	async clearSubscription(organizationId: string): Promise<void> {
		await db
			.update(organizations)
			.set({
				stripe_subscription_id: null,
				subscription_status: null,
				billing_period_starts_at: null,
				billing_period_ends_at: null,
				cancel_at_period_end: false,
				updated_at: new Date()
			})
			.where(eq(organizations.id, organizationId));
	}

	/**
	 * Schedule a downgrade to Free at the end of the current billing period.
	 */
	async scheduleDowngrade(organizationId: string): Promise<Date> {
		const org = await this.getOrg(organizationId);

		if (org.subscription_status !== 'active') {
			throw ServiceError.conflict('Organization is already on Free plan');
		}

		if (org.cancel_at_period_end) {
			throw ServiceError.conflict('A plan change is already scheduled');
		}

		if (!org.stripe_subscription_id) {
			throw ServiceError.internal('Organization has no Stripe subscription');
		}

		const updated = await this.stripe.updateSubscription(
			org.stripe_subscription_id,
			{ cancel_at_period_end: true }
		);

		await this.syncSubscription(updated);

		return org.billing_period_ends_at!;
	}

	/**
	 * Cancel a scheduled downgrade, keeping Pro.
	 */
	async cancelScheduledDowngrade(organizationId: string): Promise<void> {
		const org = await this.getOrg(organizationId);

		if (!org.cancel_at_period_end) {
			throw ServiceError.conflict('No plan change is scheduled');
		}

		if (!org.stripe_subscription_id) {
			throw ServiceError.internal('Organization has no Stripe subscription');
		}

		const updated = await this.stripe.updateSubscription(
			org.stripe_subscription_id,
			{ cancel_at_period_end: false }
		);

		await this.syncSubscription(updated);
	}

	/**
	 * Check if a downgrade is pending for an organization.
	 */
	async getPendingCancellation(organizationId: string): Promise<{
		effectiveDate: Date;
	} | null> {
		const org = await this.getOrg(organizationId);

		if (!org.cancel_at_period_end || !org.billing_period_ends_at) {
			return null;
		}

		return { effectiveDate: org.billing_period_ends_at };
	}

	/**
	 * Create a Stripe Billing Portal session for managing payment methods.
	 */
	async createPortalSession(
		organizationId: string,
		origin: string,
		flow?: 'payment_method_update'
	): Promise<string> {
		const org = await this.getOrg(organizationId);

		if (!org.stripe_customer_id) {
			throw ServiceError.badRequest(
				'No Stripe customer — upgrade to Pro first or contact support'
			);
		}

		const session = await this.stripe.createPortalSession({
			customer: org.stripe_customer_id,
			return_url: `${origin}/auth/account`,
			...(flow && { flow_data: { type: flow } })
		});

		return session.url;
	}

	/**
	 * Get an organization by ID, or throw.
	 */
	private async getOrg(organizationId: string) {
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org) {
			throw ServiceError.notFound('Organization not found');
		}

		return org;
	}
}

export const subscriptionService = new SubscriptionService();
