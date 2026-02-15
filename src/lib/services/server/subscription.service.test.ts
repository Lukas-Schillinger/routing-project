import { db } from '$lib/server/db';
import { organizations } from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createMockStripeSubscription,
	createOrganization,
	createUser,
	mockStripeClient,
	mockStripeState,
	withTestTransaction
} from '$lib/testing';
import { billingConfig } from '$lib/config/billing';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionService } from './subscription.service';

/**
 * Subscription Service Tests
 *
 * Tests subscription management including upgrades via Checkout, credit purchases,
 * subscription syncing, downgrades via cancel_at_period_end, and pending cancellation checks.
 * Uses withTestTransaction for automatic rollback.
 */

// Mock the Stripe client module
vi.mock('$lib/services/external/stripe/client', () => ({
	stripeClient: mockStripeClient
}));

// Cast mock to expected type (mock has all required methods but not private class properties)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const service = new SubscriptionService(mockStripeClient as any);

beforeEach(() => {
	mockStripeState.clear();
});

/**
 * Helper: set up a Pro organization with billing fields populated directly on the org.
 */
async function makeProOrg(
	orgId: string,
	overrides?: { cancel_at_period_end?: boolean }
) {
	const now = new Date();
	const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

	await db
		.update(organizations)
		.set({
			stripe_customer_id: 'cus_test',
			stripe_subscription_id: 'sub_test',
			subscription_status: 'active',
			billing_period_starts_at: now,
			billing_period_ends_at: periodEnd,
			cancel_at_period_end: overrides?.cancel_at_period_end ?? false
		})
		.where(eq(organizations.id, orgId));

	// Add matching subscription to mock Stripe state
	const nowUnix = Math.floor(now.getTime() / 1000);
	mockStripeState.subscriptions.push({
		id: 'sub_test',
		customer: 'cus_test',
		status: 'active',
		schedule: null,
		items: {
			data: [
				{
					id: 'si_mock',
					price: { id: billingConfig.proPlanPriceId },
					current_period_start: nowUnix,
					current_period_end: Math.floor(periodEnd.getTime() / 1000)
				}
			]
		},
		metadata: { organization_id: orgId }
	});
}

describe('SubscriptionService', () => {
	describe('createUpgradeCheckout()', () => {
		it('creates checkout session for free org with no Stripe customer (lazy creation)', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const url = await service.createUpgradeCheckout(
					organization.id,
					'admin@example.com',
					'https://example.com'
				);

				expect(url).toContain('https://checkout.stripe.com');

				// Verify customer was created lazily
				expect(mockStripeState.calls.createCustomer).toHaveLength(1);
				expect(mockStripeState.calls.createCustomer[0].email).toBe(
					'admin@example.com'
				);
				expect(mockStripeState.calls.createCustomer[0].organizationId).toBe(
					organization.id
				);

				// Verify checkout session was created with subscription mode
				expect(mockStripeState.calls.createCheckoutSession).toHaveLength(1);
				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.mode).toBe('subscription');
				expect(call.line_items).toEqual([
					{ price: billingConfig.proPlanPriceId, quantity: 1 }
				]);

				// Verify stripe_customer_id was saved to the org
				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));
				expect(updated.stripe_customer_id).toBe('cus_mock_1');
			});
		});

		it('creates checkout session for org with existing Stripe customer', async () => {
			await withTestTransaction(async () => {
				const organization = await createOrganization({
					stripe_customer_id: 'cus_existing'
				});
				await createUser({
					organization_id: organization.id,
					role: 'admin'
				});

				const url = await service.createUpgradeCheckout(
					organization.id,
					'admin@example.com',
					'https://example.com'
				);

				expect(url).toContain('https://checkout.stripe.com');

				// No new customer should have been created
				expect(mockStripeState.calls.createCustomer).toHaveLength(0);

				// Checkout session should use existing customer
				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.customer).toBe('cus_existing');
			});
		});

		it('throws conflict if org is already on Pro', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id);

				await expect(
					service.createUpgradeCheckout(
						organization.id,
						'admin@example.com',
						'https://example.com'
					)
				).rejects.toThrow('Already on Pro');
			});
		});

		it('throws not found for non-existent org', async () => {
			await withTestTransaction(async () => {
				await expect(
					service.createUpgradeCheckout(
						'00000000-0000-0000-0000-000000000000',
						'admin@example.com',
						'https://example.com'
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});
	});

	describe('createCreditPurchaseSession()', () => {
		it('creates checkout session for credit purchase', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id);

				const url = await service.createCreditPurchaseSession(
					organization.id,
					500,
					'https://example.com'
				);

				expect(url).toContain('https://checkout.stripe.com');
				expect(mockStripeState.calls.createCheckoutSession).toHaveLength(1);

				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.mode).toBe('payment');
				expect(call.line_items).toEqual([
					{ price: billingConfig.creditPriceId, quantity: 500 }
				]);
			});
		});

		it('uses default returnUrl of /maps when not provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id);

				await service.createCreditPurchaseSession(
					organization.id,
					500,
					'https://example.com'
				);

				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.success_url).toBe('https://example.com/maps');
				expect(call.cancel_url).toBe('https://example.com/maps');
			});
		});

		it('uses custom returnUrl when provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id);

				await service.createCreditPurchaseSession(
					organization.id,
					500,
					'https://example.com',
					'/maps/123'
				);

				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.success_url).toBe('https://example.com/maps/123');
				expect(call.cancel_url).toBe('https://example.com/maps/123');
			});
		});

		it('throws validation error for purchase below minimum', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id);

				await expect(
					service.createCreditPurchaseSession(
						organization.id,
						billingConfig.minCreditPurchase - 1,
						'https://example.com'
					)
				).rejects.toThrow('Minimum credit purchase');
			});
		});

		it('throws badRequest if org has no stripe_customer_id', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// org has no stripe_customer_id by default
				await expect(
					service.createCreditPurchaseSession(
						organization.id,
						500,
						'https://example.com'
					)
				).rejects.toMatchObject({ code: 'BAD_REQUEST' });
			});
		});
	});

	describe('syncSubscription()', () => {
		it('updates org billing fields from Stripe subscription', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const now = Math.floor(Date.now() / 1000);
				const periodEnd = now + 30 * 24 * 60 * 60;

				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_sync_test',
					customer: 'cus_sync_test',
					organizationId: organization.id,
					priceId: billingConfig.proPlanPriceId,
					status: 'active',
					periodStart: now,
					periodEnd: periodEnd
				});

				await service.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.stripe_subscription_id).toBe('sub_sync_test');
				expect(updated.stripe_customer_id).toBe('cus_sync_test');
				expect(updated.subscription_status).toBe('active');
				expect(updated.billing_period_starts_at).toBeInstanceOf(Date);
				expect(updated.billing_period_ends_at).toBeInstanceOf(Date);
				expect(updated.cancel_at_period_end).toBe(false);
			});
		});

		it('syncs cancel_at_period_end from Stripe', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_cancel_sync',
					customer: 'cus_cancel_sync',
					organizationId: organization.id,
					priceId: billingConfig.proPlanPriceId,
					status: 'active',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60,
					cancelAtPeriodEnd: true
				});

				await service.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.cancel_at_period_end).toBe(true);
			});
		});

		it('throws error when organization_id missing from metadata', async () => {
			await withTestTransaction(async () => {
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_no_org',
					organizationId: ''
				});
				stripeSubscription.metadata = {};

				await expect(
					service.syncSubscription(stripeSubscription)
				).rejects.toThrow('organization_id');
			});
		});
	});

	describe('clearSubscription()', () => {
		it('clears all subscription fields on org', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id);

				// Verify org is Pro before clearing
				const [before] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));
				expect(before.subscription_status).toBe('active');
				expect(before.stripe_subscription_id).toBe('sub_test');

				await service.clearSubscription(organization.id);

				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.stripe_subscription_id).toBeNull();
				expect(updated.subscription_status).toBeNull();
				expect(updated.billing_period_starts_at).toBeNull();
				expect(updated.billing_period_ends_at).toBeNull();
				expect(updated.cancel_at_period_end).toBe(false);
				// stripe_customer_id should be preserved
				expect(updated.stripe_customer_id).toBe('cus_test');
			});
		});
	});

	describe('scheduleDowngrade()', () => {
		it('sets cancel_at_period_end via Stripe and syncs to org fields', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id);

				const effectiveDate = await service.scheduleDowngrade(organization.id);

				expect(effectiveDate).toBeInstanceOf(Date);

				// Verify local org record updated
				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.cancel_at_period_end).toBe(true);
			});
		});

		it('throws conflict if org is not on Pro (not active)', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// Organization is on Free by default (no subscription_status)
				await expect(
					service.scheduleDowngrade(organization.id)
				).rejects.toThrow('already on Free plan');
			});
		});

		it('throws conflict if downgrade is already scheduled', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id, { cancel_at_period_end: true });

				await expect(
					service.scheduleDowngrade(organization.id)
				).rejects.toThrow('already scheduled');
			});
		});
	});

	describe('cancelScheduledDowngrade()', () => {
		it('removes cancel_at_period_end via Stripe and syncs to org fields', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id, { cancel_at_period_end: true });

				await service.cancelScheduledDowngrade(organization.id);

				// Verify local org record cleared
				const [updated] = await db
					.select()
					.from(organizations)
					.where(eq(organizations.id, organization.id));

				expect(updated.cancel_at_period_end).toBe(false);
			});
		});

		it('throws conflict if no downgrade is scheduled', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// No cancel_at_period_end set (org is Free by default)
				await expect(
					service.cancelScheduledDowngrade(organization.id)
				).rejects.toThrow('No plan change is scheduled');
			});
		});
	});

	describe('getPendingCancellation()', () => {
		it('returns effectiveDate when cancel_at_period_end is true', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id, { cancel_at_period_end: true });

				const result = await service.getPendingCancellation(organization.id);

				expect(result).not.toBeNull();
				expect(result?.effectiveDate).toBeInstanceOf(Date);
			});
		});

		it('returns null when no cancellation pending', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const result = await service.getPendingCancellation(organization.id);

				expect(result).toBeNull();
			});
		});

		it('returns null when cancel_at_period_end is false on Pro org', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await makeProOrg(organization.id, { cancel_at_period_end: false });

				const result = await service.getPendingCancellation(organization.id);

				expect(result).toBeNull();
			});
		});
	});
});
