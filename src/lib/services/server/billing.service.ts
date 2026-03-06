import { billingConfig } from '$lib/config/billing';
import { db } from '$lib/server/db';
import {
	creditTransactions,
	getOrgPlan,
	organizations
} from '$lib/server/db/schema';
import type { CreditBalance } from '$lib/schemas/billing';
import { and, desc, eq, gte, inArray, sql } from 'drizzle-orm';
import { ServiceError } from './errors';

type CreditTransaction = typeof creditTransactions.$inferSelect;

/**
 * Get the start of the current calendar month (UTC).
 */
function getCalendarMonthStart(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Get the start of the next calendar month (UTC).
 */
function getCalendarMonthEnd(): Date {
	const now = new Date();
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
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
	 * Get billing info for an organization (plan, credits, period).
	 * No subscription = Free tier with calendar month periods.
	 */
	async getBillingInfo(organizationId: string) {
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org) {
			throw ServiceError.notFound('Organization not found');
		}

		const plan = getOrgPlan(org);
		const monthlyCredits =
			plan === 'pro'
				? billingConfig.proMonthlyCredits
				: billingConfig.freeMonthlyCredits;

		// Pro: use billing period from Stripe. Free: use calendar month.
		const periodStartsAt =
			plan === 'pro' && org.billing_period_starts_at
				? org.billing_period_starts_at
				: getCalendarMonthStart();
		const periodEndsAt =
			plan === 'pro' && org.billing_period_ends_at
				? org.billing_period_ends_at
				: getCalendarMonthEnd();

		return {
			organization: org,
			plan,
			monthlyCredits,
			periodStartsAt,
			periodEndsAt
		};
	}

	/**
	 * Get available credit balance for an organization.
	 * Formula: monthlyCredits - usage_this_period + purchased_balance
	 */
	async getAvailableCredits(organizationId: string): Promise<number> {
		const { monthlyCredits, periodStartsAt } =
			await this.getBillingInfo(organizationId);
		const [usageThisPeriod, purchasedBalance] = await Promise.all([
			this.getUsageInPeriod(organizationId, periodStartsAt),
			this.getPurchasedBalance(organizationId)
		]);
		return monthlyCredits - usageThisPeriod + purchasedBalance;
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
		const rows = await db
			.insert(creditTransactions)
			.values({
				organization_id: organizationId,
				type: 'purchase',
				amount,
				stripe_payment_intent_id: stripePaymentIntentId,
				description: description ?? `Purchased ${amount} credits`
			})
			.onConflictDoNothing({
				target: creditTransactions.stripe_payment_intent_id
			})
			.returning({ id: creditTransactions.id });

		if (rows.length === 0) {
			throw ServiceError.conflict(
				`Duplicate credit grant for payment intent ${stripePaymentIntentId}`
			);
		}
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
		const rows = await db
			.insert(creditTransactions)
			.values({
				organization_id: organizationId,
				type: 'usage',
				amount: -Math.abs(amount),
				optimization_job_id: optimizationJobId,
				description: description ?? 'Route optimization'
			})
			.onConflictDoNothing({
				target: creditTransactions.optimization_job_id
			})
			.returning({ id: creditTransactions.id });

		if (rows.length === 0) {
			throw ServiceError.conflict(
				`Duplicate usage record for optimization job ${optimizationJobId}`
			);
		}
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
			.orderBy(desc(creditTransactions.created_at))
			.limit(limit);
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
			description
		});
	}
}

export const billingService = new BillingService();
