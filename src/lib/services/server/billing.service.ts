import { db } from '$lib/server/db';
import {
	creditTransactions,
	plans,
	subscriptions,
	type Plan
} from '$lib/server/db/schema';
import type { CreditBalance } from '$lib/schemas/billing';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { ServiceError } from './errors';

type CreditTransaction = typeof creditTransactions.$inferSelect;
type Subscription = typeof subscriptions.$inferSelect;

type SubscriptionWithPlan = {
	subscription: Subscription;
	plan: Plan;
};

type IdempotencyColumn =
	| typeof creditTransactions.stripe_payment_intent_id
	| typeof creditTransactions.optimization_job_id;

/**
 * Check if a transaction already exists by idempotency key.
 * Returns true if transaction exists (should skip), false if new.
 */
async function transactionExists(
	column: IdempotencyColumn,
	value: string
): Promise<boolean> {
	const existing = await db
		.select({ id: creditTransactions.id })
		.from(creditTransactions)
		.where(eq(column, value))
		.limit(1);

	return existing.length > 0;
}

export class BillingService {
	/**
	 * Get the total usage (as a positive number) within the current billing period.
	 */
	private async getUsageInPeriod(
		organizationId: string,
		periodStartsAt: Date
	): Promise<number> {
		const result = await db
			.select({
				total: sql<number>`COALESCE(SUM(ABS(${creditTransactions.amount})), 0)::int`
			})
			.from(creditTransactions)
			.where(
				and(
					eq(creditTransactions.organization_id, organizationId),
					eq(creditTransactions.type, 'usage'),
					gte(creditTransactions.created_at, periodStartsAt)
				)
			);

		return result[0]?.total ?? 0;
	}

	/**
	 * Get the balance of purchased/adjusted/refunded credits (all time, no expiry).
	 */
	private async getPurchasedBalance(organizationId: string): Promise<number> {
		const result = await db
			.select({
				total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)::int`
			})
			.from(creditTransactions)
			.where(
				and(
					eq(creditTransactions.organization_id, organizationId),
					inArray(creditTransactions.type, ['purchase', 'adjustment', 'refund'])
				)
			);

		return result[0]?.total ?? 0;
	}

	/**
	 * Get available credit balance for an organization.
	 * Derives subscription credits from the plan instead of tracking them in a ledger.
	 *
	 * Formula: plan.monthly_credits - usage_this_period + purchased_balance
	 */
	async getAvailableCredits(organizationId: string): Promise<number> {
		const { subscription, plan } = await this.getSubscription(organizationId);
		const [usageThisPeriod, purchasedBalance] = await Promise.all([
			this.getUsageInPeriod(organizationId, subscription.period_starts_at),
			this.getPurchasedBalance(organizationId)
		]);
		return plan.monthly_credits - usageThisPeriod + purchasedBalance;
	}

	/**
	 * Get credit balance details for display.
	 */
	async getCreditBalance(organizationId: string): Promise<CreditBalance> {
		const available = await this.getAvailableCredits(organizationId);
		return { available };
	}

	/**
	 * Check if organization has sufficient credits.
	 */
	async hasCredits(
		organizationId: string,
		requiredAmount: number
	): Promise<boolean> {
		const available = await this.getAvailableCredits(organizationId);
		return available >= requiredAmount;
	}

	/**
	 * Grant purchased credits after successful Stripe payment. Never expire.
	 */
	async grantPurchasedCredits(
		organizationId: string,
		amount: number,
		stripePaymentIntentId: string,
		description?: string
	): Promise<void> {
		if (
			await transactionExists(
				creditTransactions.stripe_payment_intent_id,
				stripePaymentIntentId
			)
		) {
			return;
		}

		await db.insert(creditTransactions).values({
			organization_id: organizationId,
			type: 'purchase',
			amount,
			expires_at: null,
			stripe_payment_intent_id: stripePaymentIntentId,
			description: description ?? `Purchased ${amount} credits`
		});
	}

	/**
	 * Record credit usage after successful optimization.
	 */
	async recordUsage(
		organizationId: string,
		amount: number,
		optimizationJobId: string,
		description?: string
	): Promise<void> {
		if (
			await transactionExists(
				creditTransactions.optimization_job_id,
				optimizationJobId
			)
		) {
			return;
		}

		await db.insert(creditTransactions).values({
			organization_id: organizationId,
			type: 'usage',
			amount: -Math.abs(amount),
			expires_at: null,
			optimization_job_id: optimizationJobId,
			description: description ?? 'Route optimization'
		});
	}

	/**
	 * Get recent credit transactions for an organization.
	 */
	async getTransactionHistory(
		organizationId: string,
		limit: number = 50
	): Promise<CreditTransaction[]> {
		return db
			.select()
			.from(creditTransactions)
			.where(eq(creditTransactions.organization_id, organizationId))
			.orderBy(sql`${creditTransactions.created_at} DESC`)
			.limit(limit);
	}

	/**
	 * Get the organization's current subscription with plan details.
	 */
	async getSubscription(organizationId: string): Promise<SubscriptionWithPlan> {
		const [subscription] = await db
			.select({
				subscription: subscriptions,
				plan: plans
			})
			.from(subscriptions)
			.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
			.where(eq(subscriptions.organization_id, organizationId))
			.limit(1);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		return subscription;
	}

	/**
	 * Adjust credits manually (admin use: refunds, goodwill, corrections).
	 */
	async adjustCredits(
		organizationId: string,
		amount: number,
		type: 'adjustment' | 'refund',
		description: string
	): Promise<void> {
		await db.insert(creditTransactions).values({
			organization_id: organizationId,
			type,
			amount,
			expires_at: null,
			description
		});
	}
}

export const billingService = new BillingService();
