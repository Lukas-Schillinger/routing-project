import { db } from '$lib/server/db';
import {
	creditTransactions,
	plans,
	subscriptions
} from '$lib/server/db/schema';
import { and, eq, gt, isNull, or, sql, sum } from 'drizzle-orm';
import { ServiceError } from './errors';

type CreditBalance = {
	available: number;
	expiring: number;
	expiresAt: Date | null;
};

export class BillingService {
	/**
	 * Get available credit balance for an organization.
	 * Only counts non-expired credits.
	 */
	async getAvailableCredits(organizationId: string): Promise<number> {
		const now = new Date();

		const result = await db
			.select({
				total: sum(creditTransactions.amount)
			})
			.from(creditTransactions)
			.where(
				and(
					eq(creditTransactions.organization_id, organizationId),
					or(
						isNull(creditTransactions.expires_at),
						gt(creditTransactions.expires_at, now)
					)
				)
			);

		return Number(result[0]?.total ?? 0);
	}

	/**
	 * Get detailed credit balance including expiring credits.
	 */
	async getCreditBalance(organizationId: string): Promise<CreditBalance> {
		const now = new Date();

		// Get total available (non-expired)
		const available = await this.getAvailableCredits(organizationId);

		// Get earliest expiring credits
		const expiringResult = await db
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
			);

		return {
			available,
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
	 * Grant subscription credits (called on subscription renewal via webhook).
	 * Credits expire at the end of the billing period.
	 * Uses stripe_invoice_id for idempotency.
	 */
	async grantSubscriptionCredits(
		organizationId: string,
		amount: number,
		expiresAt: Date,
		stripeInvoiceId: string,
		description?: string
	): Promise<void> {
		// Check idempotency - don't double-grant for same invoice
		const existing = await db
			.select({ id: creditTransactions.id })
			.from(creditTransactions)
			.where(eq(creditTransactions.stripe_invoice_id, stripeInvoiceId))
			.limit(1);

		if (existing.length > 0) {
			return; // Already processed this invoice
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
	 * Grant purchased credits (called after successful Stripe payment).
	 * Purchased credits never expire.
	 * Uses stripe_payment_intent_id for idempotency.
	 */
	async grantPurchasedCredits(
		organizationId: string,
		amount: number,
		stripePaymentIntentId: string,
		description?: string
	): Promise<void> {
		// Check idempotency - don't double-grant for same payment
		const existing = await db
			.select({ id: creditTransactions.id })
			.from(creditTransactions)
			.where(
				eq(creditTransactions.stripe_payment_intent_id, stripePaymentIntentId)
			)
			.limit(1);

		if (existing.length > 0) {
			return; // Already processed this payment
		}

		await db.insert(creditTransactions).values({
			organization_id: organizationId,
			type: 'purchase',
			amount,
			expires_at: null, // Purchased credits never expire
			stripe_payment_intent_id: stripePaymentIntentId,
			description: description ?? `Purchased ${amount} credits`
		});
	}

	/**
	 * Record credit usage after successful optimization.
	 * Uses optimization_job_id for idempotency.
	 */
	async recordUsage(
		organizationId: string,
		amount: number,
		optimizationJobId: string,
		description?: string
	): Promise<void> {
		// Check idempotency - don't double-charge for same job
		const existing = await db
			.select({ id: creditTransactions.id })
			.from(creditTransactions)
			.where(eq(creditTransactions.optimization_job_id, optimizationJobId))
			.limit(1);

		if (existing.length > 0) {
			return; // Already recorded usage for this job
		}

		// Record as negative amount (debit)
		await db.insert(creditTransactions).values({
			organization_id: organizationId,
			type: 'usage',
			amount: -Math.abs(amount), // Ensure negative
			expires_at: null,
			optimization_job_id: optimizationJobId,
			description: description ?? 'Route optimization'
		});
	}

	/**
	 * Get recent credit transactions for an organization.
	 */
	async getTransactionHistory(organizationId: string, limit: number = 50) {
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
	async getSubscription(organizationId: string) {
		const result = await db
			.select({
				subscription: subscriptions,
				plan: plans
			})
			.from(subscriptions)
			.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
			.where(eq(subscriptions.organization_id, organizationId))
			.limit(1);

		if (result.length === 0) {
			throw ServiceError.notFound('Subscription not found');
		}

		return result[0];
	}

	/**
	 * Adjust credits manually (for admin use - refunds, goodwill, corrections).
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
