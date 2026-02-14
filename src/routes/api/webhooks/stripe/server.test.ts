/**
 * Stripe Webhook Handler Tests
 *
 * Tests the webhook event routing and handling logic.
 * Uses mock Stripe events and verifies correct service calls.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

import { db } from '$lib/server/db';
import { creditTransactions, subscriptions } from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createDepot,
	createLocation,
	createMap,
	createMatrix,
	createMockStripeSubscription,
	createOptimizationJob,
	mockStripeClient,
	mockStripeState,
	withTestTransaction
} from '$lib/testing';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Stripe client module
vi.mock('$lib/services/external/stripe/client', () => ({
	stripeClient: mockStripeClient
}));

// Import the services after mocking
import { billingService } from '$lib/services/server/billing.service';
import { subscriptionService } from '$lib/services/server/subscription.service';

beforeEach(() => {
	mockStripeState.clear();
	vi.clearAllMocks();
});

describe('Stripe Webhook - Checkout Events', () => {
	describe('checkout.session.completed (credits)', () => {
		it('grants purchased credits when checkout completes', async () => {
			await withTestTransaction(async () => {
				const { organization, freePlan } = await createBillingTestEnvironment();
				const creditAmount = 100;
				const paymentIntentId = `pi_test_${Date.now()}`;

				// Grant credits as the webhook would
				await billingService.grantPurchasedCredits(
					organization.id,
					creditAmount,
					paymentIntentId,
					`Purchased ${creditAmount} credits`
				);

				// Verify credits were granted (derived: plan credits + purchased)
				const balance = await billingService.getAvailableCredits(
					organization.id
				);
				expect(balance).toBe(freePlan.monthly_credits + creditAmount);

				// Verify transaction record
				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].type).toBe('purchase');
				expect(transactions[0].amount).toBe(creditAmount);
				expect(transactions[0].stripe_payment_intent_id).toBe(paymentIntentId);
			});
		});

		it('is idempotent - does not double grant on retry', async () => {
			await withTestTransaction(async () => {
				const { organization, freePlan } = await createBillingTestEnvironment();
				const paymentIntentId = `pi_test_idempotent_${Date.now()}`;

				// Simulate webhook called twice (retry)
				await billingService.grantPurchasedCredits(
					organization.id,
					100,
					paymentIntentId
				);
				await billingService.grantPurchasedCredits(
					organization.id,
					100,
					paymentIntentId
				);

				// Should only have one transaction
				const balance = await billingService.getAvailableCredits(
					organization.id
				);
				expect(balance).toBe(freePlan.monthly_credits + 100);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));
				expect(transactions).toHaveLength(1);
			});
		});
	});
});

describe('Stripe Webhook - Subscription Events', () => {
	describe('customer.subscription.updated', () => {
		it('syncs subscription data from Stripe', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_sync_test',
					customer: subscription.stripe_customer_id,
					organizationId: organization.id,
					priceId: proPlan.stripe_price_id,
					status: 'active',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60
				});

				await subscriptionService.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.stripe_subscription_id).toBe('sub_sync_test');
				expect(updated.status).toBe('active');
				expect(updated.plan_id).toBe(proPlan.id);
			});
		});

		it('updates plan when subscription changes', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan, freePlan } =
					await createBillingTestEnvironment();

				// First set to Pro
				await db
					.update(subscriptions)
					.set({ plan_id: proPlan.id })
					.where(eq(subscriptions.organization_id, organization.id));

				const now = Math.floor(Date.now() / 1000);

				// Create subscription changing to Free
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_downgrade_test',
					customer: subscription.stripe_customer_id,
					organizationId: organization.id,
					priceId: freePlan.stripe_price_id,
					status: 'active',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60
				});

				await subscriptionService.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.plan_id).toBe(freePlan.id);
			});
		});

		it('syncs cancel_at_period_end from Stripe', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_cancel_test',
					customer: subscription.stripe_customer_id,
					organizationId: organization.id,
					priceId: proPlan.stripe_price_id,
					status: 'active',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60,
					cancelAtPeriodEnd: true
				});

				await subscriptionService.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.cancel_at_period_end).toBe(true);
			});
		});

		it('handles status changes (past_due, canceled, etc)', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: subscription.stripe_subscription_id,
					customer: subscription.stripe_customer_id,
					organizationId: organization.id,
					priceId: proPlan.stripe_price_id,
					status: 'past_due',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60
				});

				await subscriptionService.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.status).toBe('past_due');
			});
		});
	});
});

describe('Stripe Webhook - Error Handling', () => {
	it('throws on missing organization_id in subscription metadata', async () => {
		const stripeSubscription = createMockStripeSubscription({
			id: 'sub_no_org',
			organizationId: ''
		});

		// Clear metadata
		stripeSubscription.metadata = {};

		await expect(
			subscriptionService.syncSubscription(stripeSubscription)
		).rejects.toThrow('organization_id');
	});

	it('throws on unknown price ID', async () => {
		await withTestTransaction(async () => {
			const { organization } = await createBillingTestEnvironment();

			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_unknown_price',
				organizationId: organization.id,
				priceId: 'price_unknown_xyz'
			});

			await expect(
				subscriptionService.syncSubscription(stripeSubscription)
			).rejects.toThrow('Plan not found');
		});
	});
});

describe('Stripe Webhook - Credit Balance Verification', () => {
	it('correctly calculates derived balance with purchased credits and usage', async () => {
		await withTestTransaction(async () => {
			const { organization, user, freePlan } =
				await createBillingTestEnvironment();

			// Grant purchased credits
			await billingService.grantPurchasedCredits(
				organization.id,
				100,
				`pi_purchase_${Date.now()}`
			);

			// Record some usage
			const map = await createMap({
				organization_id: organization.id,
				created_by: user.id
			});
			const location = await createLocation({
				organization_id: organization.id
			});
			const depot = await createDepot({
				organization_id: organization.id,
				location_id: location.id
			});
			const matrix = await createMatrix({
				organization_id: organization.id,
				map_id: map.id
			});
			const job = await createOptimizationJob({
				organization_id: organization.id,
				map_id: map.id,
				matrix_id: matrix.id,
				depot_id: depot.id,
				status: 'completed'
			});

			await billingService.recordUsage(organization.id, 50, job.id);

			// Verify derived balance: plan.monthly_credits + 100 purchased - 50 usage
			const balance = await billingService.getAvailableCredits(organization.id);
			expect(balance).toBe(freePlan.monthly_credits + 100 - 50);
		});
	});

	it('derives subscription credits from plan without ledger entries', async () => {
		await withTestTransaction(async () => {
			const { organization, freePlan } = await createBillingTestEnvironment();

			// No transactions at all - credits should come from plan
			const balance = await billingService.getAvailableCredits(organization.id);
			expect(balance).toBe(freePlan.monthly_credits);
		});
	});

	it('reflects new plan credits immediately after subscription sync', async () => {
		await withTestTransaction(async () => {
			const { organization, subscription, proPlan } =
				await createBillingTestEnvironment();

			// Sync to Pro plan
			const now = Math.floor(Date.now() / 1000);
			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_upgrade_credits',
				customer: subscription.stripe_customer_id,
				organizationId: organization.id,
				priceId: proPlan.stripe_price_id,
				status: 'active',
				periodStart: now,
				periodEnd: now + 30 * 24 * 60 * 60
			});

			await subscriptionService.syncSubscription(stripeSubscription);

			// Credits should immediately reflect Pro plan allowance
			const balance = await billingService.getAvailableCredits(organization.id);
			expect(balance).toBe(proPlan.monthly_credits);
		});
	});
});
