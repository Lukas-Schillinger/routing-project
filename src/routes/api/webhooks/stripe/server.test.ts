/**
 * Stripe Webhook Handler Tests
 *
 * Tests the webhook event routing and handling logic.
 * Uses mock Stripe events and verifies correct service calls.
 */

import { db } from '$lib/server/db';
import {
	creditTransactions,
	depots,
	locations,
	maps,
	matrices,
	optimizationJobs,
	organizations,
	subscriptions
} from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createDepot,
	createLocation,
	createMap,
	createMatrix,
	createMockStripeSubscription,
	createOptimizationJob,
	createUser,
	mockStripeClient,
	mockStripeState
} from '$lib/testing';
import { eq } from 'drizzle-orm';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';

// Mock the Stripe client module
vi.mock('$lib/services/external/stripe/client', () => ({
	stripeClient: mockStripeClient
}));

// Import the handler after mocking
import { billingService } from '$lib/services/server/billing.service';
import { subscriptionService } from '$lib/services/server/subscription.service';

/**
 * Test environment setup
 */
let testOrg: { id: string };
let freePlan: { id: string; stripe_price_id: string; monthly_credits: number };
let proPlan: { id: string; stripe_price_id: string; monthly_credits: number };
let testSubscription: {
	id: string;
	organization_id: string;
	stripe_customer_id: string;
	stripe_subscription_id: string;
};
const createdOrgIds: string[] = [];

beforeAll(async () => {
	const env = await createBillingTestEnvironment();

	testOrg = env.organization;
	createdOrgIds.push(testOrg.id);

	// Get plan references (plans are shared across tests)
	freePlan = env.freePlan;
	proPlan = env.proPlan;

	// Update subscription with proper Stripe IDs
	await db
		.update(subscriptions)
		.set({
			stripe_customer_id: 'cus_test_webhook',
			stripe_subscription_id: 'sub_test_webhook',
			plan_id: proPlan.id // Start on Pro for credit granting tests
		})
		.where(eq(subscriptions.organization_id, testOrg.id));

	const [sub] = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.organization_id, testOrg.id));
	testSubscription = sub;
});

afterAll(async () => {
	// Clean up in reverse dependency order
	// Note: Plans are NOT deleted - they're shared across tests
	for (const orgId of createdOrgIds) {
		await db
			.delete(creditTransactions)
			.where(eq(creditTransactions.organization_id, orgId));
		await db
			.delete(subscriptions)
			.where(eq(subscriptions.organization_id, orgId));
	}
	for (const orgId of createdOrgIds) {
		await db.delete(organizations).where(eq(organizations.id, orgId));
	}
});

beforeEach(async () => {
	mockStripeState.clear();
	vi.clearAllMocks();

	// Clear credit transactions
	await db
		.delete(creditTransactions)
		.where(eq(creditTransactions.organization_id, testOrg.id));
});

describe('Stripe Webhook - Checkout Events', () => {
	describe('checkout.session.completed (credits)', () => {
		it('grants purchased credits when checkout completes', async () => {
			const creditAmount = 100;
			const paymentIntentId = `pi_test_${Date.now()}`;

			// Grant credits as the webhook would
			await billingService.grantPurchasedCredits(
				testOrg.id,
				creditAmount,
				paymentIntentId,
				`Purchased ${creditAmount} credits`
			);

			// Verify credits were granted
			const balance = await billingService.getAvailableCredits(testOrg.id);
			expect(balance).toBe(creditAmount);

			// Verify transaction record
			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].type).toBe('purchase');
			expect(transactions[0].amount).toBe(creditAmount);
			expect(transactions[0].stripe_payment_intent_id).toBe(paymentIntentId);
			expect(transactions[0].expires_at).toBeNull(); // Purchased credits never expire
		});

		it('is idempotent - does not double grant on retry', async () => {
			const paymentIntentId = `pi_test_idempotent_${Date.now()}`;

			// Simulate webhook called twice (retry)
			await billingService.grantPurchasedCredits(
				testOrg.id,
				100,
				paymentIntentId
			);
			await billingService.grantPurchasedCredits(
				testOrg.id,
				100,
				paymentIntentId
			);

			// Should only have one transaction
			const balance = await billingService.getAvailableCredits(testOrg.id);
			expect(balance).toBe(100);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));
			expect(transactions).toHaveLength(1);
		});
	});
});

describe('Stripe Webhook - Invoice Events', () => {
	describe('invoice.paid', () => {
		it('grants subscription credits with correct expiration', async () => {
			const invoiceId = `in_test_${Date.now()}`;
			const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

			// Grant credits as webhook would after invoice.paid
			await billingService.grantSubscriptionCredits(
				testOrg.id,
				proPlan.monthly_credits,
				periodEnd,
				invoiceId,
				`Monthly ${proPlan.id} plan credits`
			);

			// Verify credits were granted
			const balance = await billingService.getAvailableCredits(testOrg.id);
			expect(balance).toBe(proPlan.monthly_credits);

			// Verify transaction record
			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].type).toBe('subscription_grant');
			expect(transactions[0].expires_at?.getTime()).toBe(periodEnd.getTime());
			expect(transactions[0].stripe_invoice_id).toBe(invoiceId);
		});

		it('is idempotent - does not double grant on retry', async () => {
			const invoiceId = `in_test_idempotent_${Date.now()}`;
			const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

			// Simulate webhook called twice (retry)
			await billingService.grantSubscriptionCredits(
				testOrg.id,
				proPlan.monthly_credits,
				periodEnd,
				invoiceId
			);
			await billingService.grantSubscriptionCredits(
				testOrg.id,
				proPlan.monthly_credits,
				periodEnd,
				invoiceId
			);

			// Should only have one transaction
			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));
			expect(transactions).toHaveLength(1);
		});
	});
});

describe('Stripe Webhook - Subscription Events', () => {
	describe('customer.subscription.updated', () => {
		it('syncs subscription data from Stripe', async () => {
			const now = Math.floor(Date.now() / 1000);
			const oneMonthFromNow = now + 30 * 24 * 60 * 60;

			// Create a mock Stripe subscription
			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_sync_test',
				customer: testSubscription.stripe_customer_id,
				organizationId: testOrg.id,
				priceId: proPlan.stripe_price_id,
				status: 'active',
				periodStart: now,
				periodEnd: oneMonthFromNow
			});

			// Sync subscription as webhook would
			await subscriptionService.syncSubscription(stripeSubscription);

			// Verify local subscription was updated
			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.stripe_subscription_id).toBe('sub_sync_test');
			expect(updated.status).toBe('active');
			expect(updated.plan_id).toBe(proPlan.id);
		});

		it('updates plan when subscription changes', async () => {
			// First ensure we're on Pro
			await db
				.update(subscriptions)
				.set({ plan_id: proPlan.id })
				.where(eq(subscriptions.organization_id, testOrg.id));

			const now = Math.floor(Date.now() / 1000);

			// Create subscription changing to Free
			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_downgrade_test',
				customer: testSubscription.stripe_customer_id,
				organizationId: testOrg.id,
				priceId: freePlan.stripe_price_id, // Changed to Free
				status: 'active',
				periodStart: now,
				periodEnd: now + 30 * 24 * 60 * 60
			});

			await subscriptionService.syncSubscription(stripeSubscription);

			// Verify plan was changed
			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.plan_id).toBe(freePlan.id);

			// Restore to Pro for other tests
			await db
				.update(subscriptions)
				.set({ plan_id: proPlan.id })
				.where(eq(subscriptions.organization_id, testOrg.id));
		});

		it('handles status changes (past_due, canceled, etc)', async () => {
			const now = Math.floor(Date.now() / 1000);

			const stripeSubscription = createMockStripeSubscription({
				id: testSubscription.stripe_subscription_id,
				customer: testSubscription.stripe_customer_id,
				organizationId: testOrg.id,
				priceId: proPlan.stripe_price_id,
				status: 'past_due',
				periodStart: now,
				periodEnd: now + 30 * 24 * 60 * 60
			});

			await subscriptionService.syncSubscription(stripeSubscription);

			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.status).toBe('past_due');

			// Restore to active
			await db
				.update(subscriptions)
				.set({ status: 'active' })
				.where(eq(subscriptions.organization_id, testOrg.id));
		});
	});

	describe('clearScheduledChange', () => {
		it('clears schedule tracking when schedule completes', async () => {
			// Set up a scheduled change
			await db
				.update(subscriptions)
				.set({
					stripe_schedule_id: 'sched_test_clear',
					scheduled_plan_id: freePlan.id
				})
				.where(eq(subscriptions.organization_id, testOrg.id));

			// Clear as webhook would when schedule completes
			await subscriptionService.clearScheduledChange(testOrg.id);

			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.stripe_schedule_id).toBeNull();
			expect(updated.scheduled_plan_id).toBeNull();
		});
	});
});

describe('Stripe Webhook - Error Handling', () => {
	it('throws on missing organization_id in subscription metadata', async () => {
		const stripeSubscription = createMockStripeSubscription({
			id: 'sub_no_org',
			organizationId: '' // Missing org ID
		});

		// Clear metadata
		stripeSubscription.metadata = {};

		await expect(
			subscriptionService.syncSubscription(stripeSubscription)
		).rejects.toThrow('organization_id');
	});

	it('throws on unknown price ID', async () => {
		const stripeSubscription = createMockStripeSubscription({
			id: 'sub_unknown_price',
			organizationId: testOrg.id,
			priceId: 'price_unknown_xyz'
		});

		await expect(
			subscriptionService.syncSubscription(stripeSubscription)
		).rejects.toThrow('Plan not found');
	});
});

describe('Stripe Webhook - Credit Balance Verification', () => {
	it('correctly calculates balance with subscription and purchased credits', async () => {
		const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		// Grant subscription credits
		await billingService.grantSubscriptionCredits(
			testOrg.id,
			200,
			periodEnd,
			`in_sub_${Date.now()}`
		);

		// Grant purchased credits
		await billingService.grantPurchasedCredits(
			testOrg.id,
			100,
			`pi_purchase_${Date.now()}`
		);

		// Record some usage - create minimal required records

		const user = await createUser({
			organization_id: testOrg.id,
			role: 'admin'
		});
		const map = await createMap({
			organization_id: testOrg.id,
			created_by: user.id
		});
		const location = await createLocation({ organization_id: testOrg.id });
		const depot = await createDepot({
			organization_id: testOrg.id,
			location_id: location.id
		});
		const matrix = await createMatrix({
			organization_id: testOrg.id,
			map_id: map.id
		});
		const job = await createOptimizationJob({
			organization_id: testOrg.id,
			map_id: map.id,
			matrix_id: matrix.id,
			depot_id: depot.id,
			status: 'completed'
		});

		await billingService.recordUsage(testOrg.id, 50, job.id);

		// Verify final balance: 200 + 100 - 50 = 250
		const balance = await billingService.getAvailableCredits(testOrg.id);
		expect(balance).toBe(250);

		// Cleanup
		await db.delete(optimizationJobs).where(eq(optimizationJobs.id, job.id));
		await db.delete(matrices).where(eq(matrices.id, matrix.id));
		await db.delete(depots).where(eq(depots.id, depot.id));
		await db.delete(locations).where(eq(locations.id, location.id));
		await db.delete(maps).where(eq(maps.id, map.id));
	});

	it('excludes expired subscription credits from balance', async () => {
		const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
		const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

		// Grant expired subscription credits
		await db.insert(creditTransactions).values({
			organization_id: testOrg.id,
			type: 'subscription_grant',
			amount: 200,
			expires_at: expiredDate,
			stripe_invoice_id: `in_expired_${Date.now()}`
		});

		// Grant valid subscription credits
		await billingService.grantSubscriptionCredits(
			testOrg.id,
			100,
			futureDate,
			`in_valid_${Date.now()}`
		);

		// Grant purchased credits (never expire)
		await billingService.grantPurchasedCredits(
			testOrg.id,
			50,
			`pi_never_expire_${Date.now()}`
		);

		// Balance should only include valid credits: 100 + 50 = 150
		const balance = await billingService.getAvailableCredits(testOrg.id);
		expect(balance).toBe(150);
	});
});
