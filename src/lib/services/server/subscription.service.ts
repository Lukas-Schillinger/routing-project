import { billingConfig, PlanSlug } from '$lib/config/billing';
import { db } from '$lib/server/db';
import {
	plans,
	subscriptions,
	type SubscriptionStatus
} from '$lib/server/db/schema';
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
	 * Upgrade an organization's subscription to Pro plan.
	 * Creates a Checkout session for the new subscription - the old subscription
	 * will be cancelled when the checkout completes (handled by webhook).
	 *
	 * @returns url - Stripe Checkout session URL for redirect
	 */
	async upgradeToProPlan(
		organizationId: string,
		origin: string,
		returnUrl?: string
	): Promise<{ url: string }> {
		const subscription = await this.getSubscriptionWithPlan(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		if (subscription.planName === PlanSlug.PRO) {
			throw ServiceError.conflict('Organization is already on Pro plan');
		}

		const redirectUrl = `${origin}${returnUrl ?? '/settings/billing'}`;

		const session = await this.stripe.createCheckoutSession({
			customer: subscription.stripe_customer_id,
			mode: 'subscription',
			line_items: [
				{
					price: billingConfig.proPlanPriceId,
					quantity: 1
				}
			],
			success_url: redirectUrl,
			cancel_url: redirectUrl,
			metadata: {
				organization_id: organizationId,
				checkout_type: 'upgrade',
				existing_subscription_id: subscription.stripe_subscription_id
			}
		});

		if (!session.url) {
			throw ServiceError.internal('Failed to create checkout session URL');
		}

		return { url: session.url };
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

		const subscription = await this.getSubscriptionByOrgId(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		const redirectUrl = `${origin}${returnUrl ?? '/maps'}`;

		const session = await this.stripe.createCheckoutSession({
			customer: subscription.stripe_customer_id,
			mode: 'payment',
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
	 * Create a Stripe billing portal session for self-service management.
	 */
	async createBillingPortalSession(
		organizationId: string,
		origin: string,
		returnUrl?: string
	): Promise<string> {
		const subscription = await this.getSubscriptionByOrgId(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		const redirectUrl = `${origin}${returnUrl ?? '/maps'}`;

		const session = await this.stripe.createBillingPortalSession({
			customer: subscription.stripe_customer_id,
			return_url: redirectUrl
		});

		return session.url;
	}

	/**
	 * Update local subscription record from Stripe subscription data.
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

		const plan = await this.getPlanByPriceId(subscriptionItem.price.id);

		if (!plan) {
			throw ServiceError.notFound(
				`Plan not found for price ID: ${subscriptionItem.price.id}`
			);
		}

		await db
			.update(subscriptions)
			.set({
				plan_id: plan.id,
				stripe_subscription_id: stripeSubscription.id,
				status: stripeSubscription.status as SubscriptionStatus,
				period_starts_at: new Date(
					subscriptionItem.current_period_start * 1000
				),
				period_ends_at: new Date(subscriptionItem.current_period_end * 1000),
				cancel_at_period_end: stripeSubscription.cancel_at_period_end ?? false,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, organizationId));
	}

	/**
	 * Get subscription by organization ID.
	 */
	private async getSubscriptionByOrgId(organizationId: string) {
		const result = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.organization_id, organizationId))
			.limit(1);

		return result[0] ?? null;
	}

	/**
	 * Get subscription with plan name by organization ID.
	 */
	private async getSubscriptionWithPlan(organizationId: string) {
		const result = await db
			.select({
				subscription: subscriptions,
				planName: plans.name
			})
			.from(subscriptions)
			.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
			.where(eq(subscriptions.organization_id, organizationId))
			.limit(1);

		if (!result[0]) return null;

		return { ...result[0].subscription, planName: result[0].planName };
	}

	/**
	 * Get plan by Stripe price ID.
	 */
	async getPlanByPriceId(priceId: string) {
		const result = await db
			.select()
			.from(plans)
			.where(eq(plans.stripe_price_id, priceId))
			.limit(1);

		return result[0] ?? null;
	}

	/**
	 * Get plan from a Stripe subscription.
	 */
	async getPlanFromStripeSubscription(subscription: Stripe.Subscription) {
		const priceId = subscription.items.data[0]?.price.id;
		if (!priceId) {
			return null;
		}
		return this.getPlanByPriceId(priceId);
	}

	/**
	 * Get plan by ID.
	 */
	async getPlanById(planId: string) {
		const result = await db
			.select()
			.from(plans)
			.where(eq(plans.id, planId))
			.limit(1);

		return result[0] ?? null;
	}

	/**
	 * Schedule a downgrade to Free plan at the end of the current billing period.
	 * Sets cancel_at_period_end on the Stripe subscription. When the subscription
	 * cancels, the webhook will auto-create a new Free subscription.
	 *
	 * @returns The date when the downgrade will take effect
	 */
	async scheduleDowngrade(organizationId: string): Promise<Date> {
		const subscription = await this.getSubscriptionWithPlan(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		if (subscription.planName === PlanSlug.FREE) {
			throw ServiceError.conflict('Organization is already on Free plan');
		}

		if (subscription.cancel_at_period_end) {
			throw ServiceError.conflict('A plan change is already scheduled');
		}

		await this.stripe.updateSubscription(subscription.stripe_subscription_id, {
			cancel_at_period_end: true
		});

		await db
			.update(subscriptions)
			.set({
				cancel_at_period_end: true,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, organizationId));

		return subscription.period_ends_at;
	}

	/**
	 * Cancel a scheduled downgrade, keeping the current plan.
	 */
	async cancelScheduledDowngrade(organizationId: string): Promise<void> {
		const subscription = await this.getSubscriptionByOrgId(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		if (!subscription.cancel_at_period_end) {
			throw ServiceError.conflict('No plan change is scheduled');
		}

		await this.stripe.updateSubscription(subscription.stripe_subscription_id, {
			cancel_at_period_end: false
		});

		await db
			.update(subscriptions)
			.set({
				cancel_at_period_end: false,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, organizationId));
	}

	/**
	 * Check if a downgrade is pending for an organization.
	 */
	async getPendingCancellation(organizationId: string): Promise<{
		effectiveDate: Date;
	} | null> {
		const subscription = await this.getSubscriptionByOrgId(organizationId);

		if (!subscription?.cancel_at_period_end) {
			return null;
		}

		return {
			effectiveDate: subscription.period_ends_at
		};
	}

	/**
	 * Get plan by slug (name).
	 */
	async getPlanBySlug(slug: PlanSlug) {
		const result = await db
			.select()
			.from(plans)
			.where(eq(plans.name, slug))
			.limit(1);

		return result[0] ?? null;
	}
}

export const subscriptionService = new SubscriptionService();
