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
	 * Create a Stripe Checkout session for upgrading to Pro plan.
	 * The customer already exists (created at signup).
	 */
	async createUpgradeCheckoutSession(
		organizationId: string,
		origin: string,
		returnUrl?: string
	): Promise<string> {
		// Get current subscription with plan details for proper plan type checking
		const subscription = await this.getSubscriptionWithPlan(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		if (subscription.planName === PlanSlug.PRO) {
			throw ServiceError.conflict('Organization is already on Pro plan');
		}

		const redirectUrl = `${origin}${returnUrl || '/maps'}`;

		// Create Checkout session for subscription upgrade
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
				checkout_type: 'upgrade'
			},
			subscription_data: {
				metadata: {
					organization_id: organizationId
				}
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

		// Get current subscription to find the Stripe customer
		const subscription = await this.getSubscriptionByOrgId(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		const redirectUrl = `${origin}${returnUrl || '/maps'}`;

		// Create Checkout session for one-time credit purchase
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

		// Default to /app if no return URL provided
		const redirectUrl = `${origin}${returnUrl || '/maps'}`;

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
		const organizationId = stripeSubscription.metadata
			.organization_id as string;

		if (!organizationId) {
			throw ServiceError.badRequest(
				'Subscription metadata missing organization_id'
			);
		}

		// Find the plan by Stripe price ID
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
	 * Get subscription with plan details by organization ID.
	 * Returns both subscription and plan name for proper plan type checking.
	 */
	private async getSubscriptionWithPlan(organizationId: string) {
		const result = await db
			.select({
				id: subscriptions.id,
				organization_id: subscriptions.organization_id,
				plan_id: subscriptions.plan_id,
				stripe_customer_id: subscriptions.stripe_customer_id,
				stripe_subscription_id: subscriptions.stripe_subscription_id,
				stripe_schedule_id: subscriptions.stripe_schedule_id,
				scheduled_plan_id: subscriptions.scheduled_plan_id,
				status: subscriptions.status,
				period_starts_at: subscriptions.period_starts_at,
				period_ends_at: subscriptions.period_ends_at,
				planName: plans.name
			})
			.from(subscriptions)
			.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
			.where(eq(subscriptions.organization_id, organizationId))
			.limit(1);

		return result[0] ?? null;
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
	 * Uses Stripe Subscription Schedules to handle the timing automatically.
	 *
	 * @returns The date when the downgrade will take effect
	 */
	async scheduleDowngrade(organizationId: string): Promise<Date> {
		// Get subscription with plan details for proper plan type checking
		const subscription = await this.getSubscriptionWithPlan(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		if (subscription.planName === PlanSlug.FREE) {
			throw ServiceError.conflict('Organization is already on Free plan');
		}

		if (subscription.stripe_schedule_id) {
			throw ServiceError.conflict('A plan change is already scheduled');
		}

		// Get the Free plan for the scheduled phase
		const freePlan = await this.getPlanBySlug(PlanSlug.FREE);
		if (!freePlan) {
			throw ServiceError.internal('Free plan not found');
		}

		// Create a schedule from the existing subscription
		const schedule = await this.stripe.createSubscriptionSchedule(
			subscription.stripe_subscription_id
		);

		// Get the current phase end time (period end)
		const currentPhase = schedule.phases[0];
		if (!currentPhase) {
			throw ServiceError.internal('Schedule has no current phase');
		}

		// Update schedule with two phases:
		// 1. Current plan until period end
		// 2. Free plan after period end
		await this.stripe.updateSubscriptionSchedule(schedule.id, {
			phases: [
				{
					items: currentPhase.items.map((item) => ({
						price: typeof item.price === 'string' ? item.price : item.price.id,
						quantity: item.quantity
					})),
					start_date: currentPhase.start_date,
					end_date: currentPhase.end_date
				},
				{
					items: [{ price: billingConfig.freePlanPriceId }]
				}
			]
		});

		// Update local record to track the scheduled change
		await db
			.update(subscriptions)
			.set({
				stripe_schedule_id: schedule.id,
				scheduled_plan_id: freePlan.id,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, organizationId));

		return subscription.period_ends_at;
	}

	/**
	 * Cancel a scheduled downgrade, keeping the current plan.
	 * This is used when a user decides to stay on Pro before the period ends.
	 */
	async cancelScheduledDowngrade(organizationId: string): Promise<void> {
		const subscription = await this.getSubscriptionByOrgId(organizationId);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		if (!subscription.stripe_schedule_id) {
			throw ServiceError.conflict('No plan change is scheduled');
		}

		// Release the schedule (keeps subscription active, removes scheduled changes)
		await this.stripe.cancelSubscriptionSchedule(
			subscription.stripe_schedule_id
		);

		// Clear the scheduled change from local record
		await db
			.update(subscriptions)
			.set({
				stripe_schedule_id: null,
				scheduled_plan_id: null,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, organizationId));
	}

	/**
	 * Check if a downgrade is scheduled for an organization.
	 */
	async getScheduledDowngrade(organizationId: string): Promise<{
		scheduledPlanId: string;
		effectiveDate: Date;
	} | null> {
		const subscription = await this.getSubscriptionByOrgId(organizationId);

		if (!subscription?.stripe_schedule_id || !subscription.scheduled_plan_id) {
			return null;
		}

		return {
			scheduledPlanId: subscription.scheduled_plan_id,
			effectiveDate: subscription.period_ends_at
		};
	}

	/**
	 * Clear scheduled change tracking after the schedule completes.
	 * Called from webhook when subscription.updated fires after schedule executes.
	 */
	async clearScheduledChange(organizationId: string): Promise<void> {
		await db
			.update(subscriptions)
			.set({
				stripe_schedule_id: null,
				scheduled_plan_id: null,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, organizationId));
	}

	/**
	 * Get plan by slug (name).
	 */
	private async getPlanBySlug(slug: PlanSlug) {
		const result = await db
			.select()
			.from(plans)
			.where(eq(plans.name, slug))
			.limit(1);

		return result[0] ?? null;
	}

	/**
	 * Cancel the old free subscription when upgrading to Pro.
	 * Called when an upgrade checkout completes to prevent duplicate subscriptions.
	 * Safe to call even if there is no existing subscription or if not on free plan.
	 */
	async cancelOldFreeSubscription(organizationId: string): Promise<void> {
		const subscription = await this.getSubscriptionWithPlan(organizationId);

		const shouldCancel =
			subscription?.planName === PlanSlug.FREE &&
			subscription.stripe_subscription_id;

		if (!shouldCancel) {
			return;
		}

		await this.stripe.cancelSubscription(subscription.stripe_subscription_id);
	}
}

export const subscriptionService = new SubscriptionService();
