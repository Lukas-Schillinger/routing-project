import { env } from '$env/dynamic/private';

/**
 * Billing configuration
 *
 * Stripe price IDs are stored in environment variables so they can differ
 * between development (test mode) and production (live mode).
 */
export const billingConfig = {
	/** Stripe price ID for Free plan ($0/month) */
	get freePlanPriceId(): string {
		const id = env.STRIPE_FREE_PLAN_PRICE_ID;
		if (!id) throw new Error('STRIPE_FREE_PLAN_PRICE_ID is not configured');
		return id;
	},

	/** Stripe price ID for Pro plan ($49/month) */
	get proPlanPriceId(): string {
		const id = env.STRIPE_PRO_PLAN_PRICE_ID;
		if (!id) throw new Error('STRIPE_PRO_PLAN_PRICE_ID is not configured');
		return id;
	},

	/** Stripe price ID for credit purchases (per-unit pricing) */
	get creditPriceId(): string {
		const id = env.STRIPE_CREDIT_PRICE_ID;
		if (!id) throw new Error('STRIPE_CREDIT_PRICE_ID is not configured');
		return id;
	},

	/** Price per credit in dollars */
	creditPricePerUnit: 0.01,

	/** Minimum credit purchase amount */
	minCreditPurchase: 100,

	/** Monthly credits included in Free plan */
	freeMonthlyCredits: 200,

	/** Monthly credits included in Pro plan */
	proMonthlyCredits: 2000,

	/** Grace period in days after payment failure */
	gracePeriodDays: 7
} as const;

/**
 * Plan slugs - these match the `name` column in the plans table
 */
export const PlanSlug = {
	FREE: 'free',
	PRO: 'pro'
} as const;

export type PlanSlug = (typeof PlanSlug)[keyof typeof PlanSlug];
