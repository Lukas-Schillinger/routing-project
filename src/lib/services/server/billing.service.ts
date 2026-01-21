import { db } from '$lib/server/db';
import {
	creditTransactions,
	plans,
	subscriptions
} from '$lib/server/db/schema';
import type { SQL } from 'drizzle-orm';
import { and, eq, gt, isNull, or, sql, sum } from 'drizzle-orm';
import { ServiceError } from './errors';

type CreditTransaction = typeof creditTransactions.$inferSelect;
type Subscription = typeof subscriptions.$inferSelect;
type Plan = typeof plans.$inferSelect;

type CreditBalance = {
	available: number;
	expiring: number;
	expiresAt: Date | null;
};

type SubscriptionWithPlan = {
	subscription: Subscription;
	plan: Plan;
};

type IdempotencyColumn =
	| typeof creditTransactions.stripe_invoice_id
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

function nonExpiredCreditsFilter(
	organizationId: string,
	now: Date
): SQL<unknown> {
	return and(
		eq(creditTransactions.organization_id, organizationId),
		or(
			isNull(creditTransactions.expires_at),
			gt(creditTransactions.expires_at, now)
		)
	)!;
}

export class BillingService {
	/**
	 * Get available credit balance for an organization (non-expired credits only).
	 */
	async getAvailableCredits(organizationId: string): Promise<number> {
		const result = await db
			.select({ total: sum(creditTransactions.amount) })
			.from(creditTransactions)
			.where(nonExpiredCreditsFilter(organizationId, new Date()));

		return Number(result[0]?.total ?? 0);
	}

	/**
	 * Get detailed credit balance including expiring credits.
	 */
	async getCreditBalance(organizationId: string): Promise<CreditBalance> {
		const now = new Date();

		const [availableResult, expiringResult] = await Promise.all([
			db
				.select({ total: sum(creditTransactions.amount) })
				.from(creditTransactions)
				.where(nonExpiredCreditsFilter(organizationId, now)),
			db
				.select({
					amount: sum(creditTransactions.amount),
					expiresAt: sql<Date>`MIN(${creditTransactions.expires_at})`
				})
				.from(creditTransactions)
				.where(
					and(
						eq(creditTransactions.organization_id, organizationId),
						gt(creditTransactions.expires_at, now)
					)
				)
		]);

		return {
			available: Number(availableResult[0]?.total ?? 0),
			expiring: Number(expiringResult[0]?.amount ?? 0),
			expiresAt: expiringResult[0]?.expiresAt ?? null
		};
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
	 * Grant subscription credits on renewal. Credits expire at billing period end.
	 */
	async grantSubscriptionCredits(
		organizationId: string,
		amount: number,
		expiresAt: Date,
		stripeInvoiceId: string,
		description?: string
	): Promise<void> {
		if (
			await transactionExists(
				creditTransactions.stripe_invoice_id,
				stripeInvoiceId
			)
		) {
			return;
		}

		await db.insert(creditTransactions).values({
			organization_id: organizationId,
			type: 'subscription_grant',
			amount,
			expires_at: expiresAt,
			stripe_invoice_id: stripeInvoiceId,
			description: description ?? 'Monthly subscription credits'
		});
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
