/**
 * Stripe Webhook Handler Tests
 *
 * Tests the webhook event routing and handling logic.
 * Uses mock Stripe events and verifies correct service calls.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

import { billingConfig } from '$lib/config/billing';
import { db } from '$lib/server/db';
import { creditTransactions, organizations } from '$lib/server/db/schema';
import {
	createDepot,
	createLocation,
	createMap,
	createMatrix,
	createMockStripeInvoice,
	createMockStripeSubscription,
	createOptimizationJob,
	createOrganization,
	createTestEnvironment,
	createUser,
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

// Mock Sentry
vi.mock('@sentry/sveltekit', () => ({
	captureException: vi.fn()
}));

// Mock mail service (handler imports it but we don't need real emails)
vi.mock('$lib/services/server/mail.service', () => ({
	mailService: { sendBillingNotificationEmails: vi.fn() }
}));

// Import the services and handler after mocking
import { env } from '$env/dynamic/private';
import { billingService } from '$lib/services/server/billing.service';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { userService } from '$lib/services/server/user.service';
import { POST } from './+server';

beforeEach(() => {
	mockStripeState.clear();
	vi.clearAllMocks();
});

describe('Stripe Webhook - Checkout Events', () => {
	describe('checkout.session.completed (credits)', () => {
		it('grants purchased credits when checkout completes', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
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
				expect(balance).toBe(billingConfig.freeMonthlyCredits + creditAmount);

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

		it('is idempotent - rejects duplicate payment intent', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();
				const paymentIntentId = `pi_test_idempotent_${Date.now()}`;

				await billingService.grantPurchasedCredits(
					organization.id,
					100,
					paymentIntentId
				);

				// Second call with same payment intent throws conflict
				await expect(
					billingService.grantPurchasedCredits(
						organization.id,
						100,
						paymentIntentId
					)
				).rejects.toThrow('Duplicate credit grant');

				// Only one transaction exists
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
				const organization = await createOrganization({
					stripe_customer_id: 'cus_test',
					stripe_subscription_id: 'sub_test',
					subscription_status: 'active',
					billing_period_starts_at: new Date(),
					billing_period_ends_at: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000
					)
				});

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_sync_test',
					customer: 'cus_test',
					organizationId: organization.id,
					priceId: billingConfig.proPlanPriceId,
					status: 'active',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60
				});

				await subscriptionService.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.stripe_subscription_id).toBe('sub_sync_test');
				expect(updated.subscription_status).toBe('active');
			});
		});

		it('syncs cancel_at_period_end from Stripe', async () => {
			await withTestTransaction(async () => {
				const organization = await createOrganization({
					stripe_customer_id: 'cus_test',
					stripe_subscription_id: 'sub_test',
					subscription_status: 'active',
					billing_period_starts_at: new Date(),
					billing_period_ends_at: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000
					)
				});

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_cancel_test',
					customer: 'cus_test',
					organizationId: organization.id,
					priceId: billingConfig.proPlanPriceId,
					status: 'active',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60,
					cancelAtPeriodEnd: true
				});

				await subscriptionService.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.cancel_at_period_end).toBe(true);
			});
		});

		it('handles status changes (past_due, canceled, etc)', async () => {
			await withTestTransaction(async () => {
				const organization = await createOrganization({
					stripe_customer_id: 'cus_test',
					stripe_subscription_id: 'sub_status_test',
					subscription_status: 'active',
					billing_period_starts_at: new Date(),
					billing_period_ends_at: new Date(
						Date.now() + 30 * 24 * 60 * 60 * 1000
					)
				});

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_status_test',
					customer: 'cus_test',
					organizationId: organization.id,
					priceId: billingConfig.proPlanPriceId,
					status: 'past_due',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60
				});

				await subscriptionService.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.subscription_status).toBe('past_due');
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
});

describe('Stripe Webhook - Credit Balance Verification', () => {
	it('correctly calculates derived balance with purchased credits and usage', async () => {
		await withTestTransaction(async () => {
			const { organization, user } = await createTestEnvironment();

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
			expect(balance).toBe(billingConfig.freeMonthlyCredits + 100 - 50);
		});
	});

	it('derives subscription credits from plan without ledger entries', async () => {
		await withTestTransaction(async () => {
			const { organization } = await createTestEnvironment();

			// No transactions at all - credits should come from plan
			const balance = await billingService.getAvailableCredits(organization.id);
			expect(balance).toBe(billingConfig.freeMonthlyCredits);
		});
	});

	it('reflects new plan credits immediately after subscription sync', async () => {
		await withTestTransaction(async () => {
			const organization = await createOrganization({
				stripe_customer_id: 'cus_test',
				stripe_subscription_id: 'sub_test',
				subscription_status: 'active',
				billing_period_starts_at: new Date(),
				billing_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			});

			// Sync to Pro plan
			const now = Math.floor(Date.now() / 1000);
			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_upgrade_credits',
				customer: 'cus_test',
				organizationId: organization.id,
				priceId: billingConfig.proPlanPriceId,
				status: 'active',
				periodStart: now,
				periodEnd: now + 30 * 24 * 60 * 60
			});

			await subscriptionService.syncSubscription(stripeSubscription);

			// Credits should immediately reflect Pro plan allowance
			const balance = await billingService.getAvailableCredits(organization.id);
			expect(balance).toBe(billingConfig.proMonthlyCredits);
		});
	});
});

describe('Stripe Webhook - Invoice Events', () => {
	describe('invoice.payment_failed / invoice.payment_action_required', () => {
		it('finds admin users for an organization to notify', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				// Create additional admin and non-admin users
				await createUser({
					organization_id: organization.id,
					role: 'admin',
					email: 'admin2@example.com'
				});
				await createUser({
					organization_id: organization.id,
					role: 'member',
					email: 'member@example.com'
				});

				const users = await userService.getPublicUsers(organization.id);
				const adminEmails = users
					.filter((u) => u.role === 'admin')
					.map((u) => u.email);

				// Should include original admin from createTestEnvironment + admin2
				expect(adminEmails).toHaveLength(2);
				expect(adminEmails).toContain('admin2@example.com');
				expect(adminEmails).not.toContain('member@example.com');
			});
		});

		it('extracts organization_id from invoice subscription metadata', () => {
			const orgId = 'test-org-id';
			const invoice = createMockStripeInvoice({ organizationId: orgId });

			// Verify the fixture structure matches what the webhook handler expects
			const metadata = (
				invoice as unknown as {
					parent?: {
						subscription_details?: { metadata?: Record<string, string> };
					};
				}
			).parent?.subscription_details?.metadata;

			expect(metadata?.organization_id).toBe(orgId);
		});
	});
});

// ---------------------------------------------------------------------------
// Handler-level tests — call POST directly to verify signature verification
// ---------------------------------------------------------------------------

function createWebhookRequest(body: string, signature?: string) {
	const headers: Record<string, string> = {
		'content-type': 'application/json'
	};
	if (signature) headers['stripe-signature'] = signature;
	return new Request('http://localhost/api/webhooks/stripe', {
		method: 'POST',
		headers,
		body
	});
}

const mockLog = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function callPost(request: Request) {
	return POST({
		request,
		locals: { log: mockLog }
	} as unknown as Parameters<typeof POST>[0]);
}

describe('Stripe Webhook - Signature Verification', () => {
	it('returns 401 when stripe-signature header is missing', async () => {
		const request = createWebhookRequest('{}');
		const response = await callPost(request);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Missing signature' });
	});

	it('returns 401 when signature verification fails', async () => {
		mockStripeState.shouldFailSignatureVerification = true;

		const request = createWebhookRequest('{}', 'bad_sig');
		const response = await callPost(request);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: 'Invalid signature' });
	});

	it('returns 200 for a valid webhook event', async () => {
		const body = JSON.stringify({
			type: 'ping.test',
			object: {}
		});
		const request = createWebhookRequest(body, 'valid_sig');
		const response = await callPost(request);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ received: true });
	});

	it('returns 500 when STRIPE_WEBHOOK_SECRET is not configured', async () => {
		const original = env.STRIPE_WEBHOOK_SECRET;
		env.STRIPE_WEBHOOK_SECRET = '';
		try {
			const request = createWebhookRequest('{}', 'some_sig');
			const response = await callPost(request);

			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({
				error: 'Webhook not configured'
			});
		} finally {
			env.STRIPE_WEBHOOK_SECRET = original;
		}
	});
});
