import { db } from '$lib/server/db';
import { subscriptions } from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createMockStripeSubscription,
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
 * Tests subscription management including upgrades, downgrades via cancel_at_period_end,
 * and subscription syncing. Uses withTestTransaction for automatic rollback.
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

describe('SubscriptionService', () => {
	describe('createUpgradeSetupIntent()', () => {
		it('creates setup intent for the correct customer and returns clientSecret', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription } =
					await createBillingTestEnvironment();

				const result = await service.createUpgradeSetupIntent(organization.id);

				expect(result.clientSecret).toContain('seti_mock_');

				const call = mockStripeState.calls.createSetupIntent[0];
				expect(call.customer).toBe(subscription.stripe_customer_id);
				expect(call.metadata).toMatchObject({
					organization_id: organization.id
				});
			});
		});

		it('throws not found if subscription does not exist', async () => {
			await withTestTransaction(async () => {
				await expect(
					service.createUpgradeSetupIntent(
						'00000000-0000-0000-0000-000000000000'
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws conflict if already on Pro plan', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				await db
					.update(subscriptions)
					.set({ plan_id: proPlan.id })
					.where(eq(subscriptions.id, subscription.id));

				await expect(
					service.createUpgradeSetupIntent(organization.id)
				).rejects.toThrow('already on Pro plan');
			});
		});
	});

	describe('completeUpgrade()', () => {
		it('sets payment method, updates subscription in-place, and syncs to DB', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				// Add customer to mock Stripe state
				mockStripeState.customers.push({
					id: subscription.stripe_customer_id,
					metadata: { organization_id: organization.id }
				});

				// Create a succeeded setup intent
				const setupIntentId = 'seti_test_upgrade';
				mockStripeState.setupIntents.push({
					id: setupIntentId,
					client_secret: `${setupIntentId}_secret`,
					customer: subscription.stripe_customer_id,
					status: 'succeeded',
					payment_method: 'pm_mock_card',
					metadata: { organization_id: organization.id }
				});

				// Add active subscription to mock Stripe state
				const now = Math.floor(Date.now() / 1000);
				mockStripeState.subscriptions.push({
					id: subscription.stripe_subscription_id,
					customer: subscription.stripe_customer_id,
					status: 'active',
					schedule: null,
					items: {
						data: [
							{
								id: 'si_mock_item',
								price: { id: billingConfig.freePlanPriceId },
								current_period_start: now,
								current_period_end: now + 30 * 24 * 60 * 60
							}
						]
					},
					metadata: { organization_id: organization.id }
				});

				await service.completeUpgrade(organization.id, setupIntentId);

				// Verify payment method was set as default on the correct customer
				const pmCall = mockStripeState.calls.setCustomerDefaultPaymentMethod[0];
				expect(pmCall.customerId).toBe(subscription.stripe_customer_id);
				expect(pmCall.paymentMethodId).toBe('pm_mock_card');

				// Verify the subscription was updated in-place (not created new)
				expect(mockStripeState.calls.createSubscription).toHaveLength(0);
				expect(mockStripeState.calls.getSubscription).toHaveLength(1);

				// Verify the Stripe subscription item was updated with Pro price
				const mockSub = mockStripeState.subscriptions.find(
					(s) => s.id === subscription.stripe_subscription_id
				);
				expect(mockSub?.items.data[0].price.id).toBe(
					billingConfig.proPlanPriceId
				);

				// Verify DB was synced to Pro plan
				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));
				expect(updated.plan_id).toBe(proPlan.id);
			});
		});

		it('rejects setup intent that has not succeeded', async () => {
			mockStripeState.setupIntents.push({
				id: 'seti_pending',
				client_secret: 'seti_pending_secret',
				customer: 'cus_test',
				status: 'requires_payment_method',
				payment_method: null,
				metadata: { organization_id: 'any-org' }
			});

			await expect(
				service.completeUpgrade('any-org', 'seti_pending')
			).rejects.toMatchObject({ code: 'BAD_REQUEST' });
		});

		it('rejects setup intent belonging to a different organization', async () => {
			mockStripeState.setupIntents.push({
				id: 'seti_wrong_org',
				client_secret: 'seti_wrong_org_secret',
				customer: 'cus_test',
				status: 'succeeded',
				payment_method: 'pm_mock',
				metadata: { organization_id: 'org-a' }
			});

			await expect(
				service.completeUpgrade('org-b', 'seti_wrong_org')
			).rejects.toMatchObject({ code: 'FORBIDDEN' });
		});

		it('rejects setup intent with no payment method attached', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				mockStripeState.setupIntents.push({
					id: 'seti_no_pm',
					client_secret: 'seti_no_pm_secret',
					customer: 'cus_test',
					status: 'succeeded',
					payment_method: null,
					metadata: { organization_id: organization.id }
				});

				await expect(
					service.completeUpgrade(organization.id, 'seti_no_pm')
				).rejects.toMatchObject({ code: 'BAD_REQUEST' });
			});
		});

		it('throws conflict if already on Pro plan', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				await db
					.update(subscriptions)
					.set({ plan_id: proPlan.id })
					.where(eq(subscriptions.id, subscription.id));

				mockStripeState.setupIntents.push({
					id: 'seti_already_pro',
					client_secret: 'seti_already_pro_secret',
					customer: subscription.stripe_customer_id,
					status: 'succeeded',
					payment_method: 'pm_mock',
					metadata: { organization_id: organization.id }
				});

				await expect(
					service.completeUpgrade(organization.id, 'seti_already_pro')
				).rejects.toThrow('already on Pro plan');
			});
		});
	});

	describe('createCreditPurchaseSession()', () => {
		it('creates checkout session for credit purchase', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const url = await service.createCreditPurchaseSession(
					organization.id,
					500,
					'https://example.com'
				);

				expect(url).toContain('https://checkout.stripe.com');
				expect(mockStripeState.calls.createCheckoutSession).toHaveLength(1);
			});
		});

		it('uses default returnUrl of /maps when not provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

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

				await expect(
					service.createCreditPurchaseSession(
						organization.id,
						billingConfig.minCreditPurchase - 1,
						'https://example.com'
					)
				).rejects.toThrow('Minimum credit purchase');
			});
		});
	});

	describe('createBillingPortalSession()', () => {
		it('creates billing portal session', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const url = await service.createBillingPortalSession(
					organization.id,
					'https://example.com'
				);

				expect(url).toContain('https://billing.stripe.com');
				expect(mockStripeState.calls.createBillingPortalSession).toHaveLength(
					1
				);
			});
		});

		it('uses default returnUrl of /maps when not provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await service.createBillingPortalSession(
					organization.id,
					'https://example.com'
				);

				const call = mockStripeState.calls.createBillingPortalSession[0];
				expect(call.return_url).toBe('https://example.com/maps');
			});
		});

		it('uses custom returnUrl when provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await service.createBillingPortalSession(
					organization.id,
					'https://example.com',
					'/settings/billing'
				);

				const call = mockStripeState.calls.createBillingPortalSession[0];
				expect(call.return_url).toBe('https://example.com/settings/billing');
			});
		});
	});

	describe('syncSubscription()', () => {
		it('creates or updates local subscription from Stripe', async () => {
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

				await service.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.stripe_subscription_id).toBe('sub_sync_test');
				expect(updated.status).toBe('active');
				expect(updated.plan_id).toBe(proPlan.id);
			});
		});

		it('syncs cancel_at_period_end from Stripe', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				const now = Math.floor(Date.now() / 1000);
				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_cancel_sync',
					customer: subscription.stripe_customer_id,
					organizationId: organization.id,
					priceId: proPlan.stripe_price_id,
					status: 'active',
					periodStart: now,
					periodEnd: now + 30 * 24 * 60 * 60,
					cancelAtPeriodEnd: true
				});

				await service.syncSubscription(stripeSubscription);

				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

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

		it('throws error when price ID not found', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const stripeSubscription = createMockStripeSubscription({
					id: 'sub_unknown_price',
					organizationId: organization.id,
					priceId: 'price_unknown_xyz'
				});

				await expect(
					service.syncSubscription(stripeSubscription)
				).rejects.toThrow('Plan not found');
			});
		});
	});

	describe('getPendingCancellation()', () => {
		it('returns effective date when cancel_at_period_end is true', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription } =
					await createBillingTestEnvironment();

				await db
					.update(subscriptions)
					.set({ cancel_at_period_end: true })
					.where(eq(subscriptions.id, subscription.id));

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
	});

	describe('scheduleDowngrade()', () => {
		it('sets cancel_at_period_end on Stripe and local record', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				// Set subscription to Pro plan
				await db
					.update(subscriptions)
					.set({ plan_id: proPlan.id })
					.where(eq(subscriptions.id, subscription.id));

				// Add subscription to mock Stripe state
				const now = Math.floor(Date.now() / 1000);
				mockStripeState.subscriptions.push({
					id: subscription.stripe_subscription_id,
					customer: subscription.stripe_customer_id,
					status: 'active',
					schedule: null,
					items: {
						data: [
							{
								id: 'si_mock',
								price: { id: proPlan.stripe_price_id },
								current_period_start: now,
								current_period_end: now + 30 * 24 * 60 * 60
							}
						]
					},
					metadata: { organization_id: organization.id }
				});

				const effectiveDate = await service.scheduleDowngrade(organization.id);

				expect(effectiveDate).toBeInstanceOf(Date);

				// Verify local record updated
				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.cancel_at_period_end).toBe(true);
			});
		});

		it('throws conflict if already on Free plan', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// Subscription is on Free plan by default
				await expect(
					service.scheduleDowngrade(organization.id)
				).rejects.toThrow('already on Free plan');
			});
		});

		it('throws conflict if downgrade already scheduled', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				// Set subscription to Pro plan with cancel_at_period_end already set
				await db
					.update(subscriptions)
					.set({
						plan_id: proPlan.id,
						cancel_at_period_end: true
					})
					.where(eq(subscriptions.id, subscription.id));

				await expect(
					service.scheduleDowngrade(organization.id)
				).rejects.toThrow('already scheduled');
			});
		});
	});

	describe('cancelScheduledDowngrade()', () => {
		it('removes cancel_at_period_end on Stripe and local record', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				// Set subscription with pending cancellation
				await db
					.update(subscriptions)
					.set({
						plan_id: proPlan.id,
						cancel_at_period_end: true
					})
					.where(eq(subscriptions.id, subscription.id));

				// Add subscription to mock Stripe state
				const now = Math.floor(Date.now() / 1000);
				mockStripeState.subscriptions.push({
					id: subscription.stripe_subscription_id,
					customer: subscription.stripe_customer_id,
					status: 'active',
					schedule: null,
					items: {
						data: [
							{
								id: 'si_mock',
								price: { id: proPlan.stripe_price_id },
								current_period_start: now,
								current_period_end: now + 30 * 24 * 60 * 60
							}
						]
					},
					metadata: { organization_id: organization.id }
				});

				await service.cancelScheduledDowngrade(organization.id);

				// Verify local record cleared
				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.cancel_at_period_end).toBe(false);
			});
		});

		it('throws conflict if no downgrade scheduled', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// No cancel_at_period_end set
				await expect(
					service.cancelScheduledDowngrade(organization.id)
				).rejects.toThrow('No plan change is scheduled');
			});
		});
	});

	describe('getPlanByPriceId()', () => {
		it('returns plan for valid price ID', async () => {
			await withTestTransaction(async () => {
				const { proPlan } = await createBillingTestEnvironment();

				const plan = await service.getPlanByPriceId(proPlan.stripe_price_id);

				expect(plan).not.toBeNull();
				expect(plan?.id).toBe(proPlan.id);
			});
		});

		it('returns null for unknown price ID', async () => {
			await withTestTransaction(async () => {
				const plan = await service.getPlanByPriceId('price_unknown');

				expect(plan).toBeNull();
			});
		});
	});

	describe('getPlanFromStripeSubscription()', () => {
		it('returns plan for valid Stripe subscription', async () => {
			await withTestTransaction(async () => {
				const { proPlan } = await createBillingTestEnvironment();

				const stripeSubscription = createMockStripeSubscription({
					priceId: proPlan.stripe_price_id
				});

				const plan =
					await service.getPlanFromStripeSubscription(stripeSubscription);

				expect(plan).not.toBeNull();
				expect(plan?.id).toBe(proPlan.id);
			});
		});

		it('returns null when subscription has no items', async () => {
			await withTestTransaction(async () => {
				const stripeSubscription = {
					id: 'sub_test',
					items: { data: [] }
				} as unknown as Parameters<
					typeof service.getPlanFromStripeSubscription
				>[0];

				const plan =
					await service.getPlanFromStripeSubscription(stripeSubscription);

				expect(plan).toBeNull();
			});
		});
	});

	describe('getPlanById()', () => {
		it('returns plan for valid ID', async () => {
			await withTestTransaction(async () => {
				const { proPlan } = await createBillingTestEnvironment();

				const plan = await service.getPlanById(proPlan.id);

				expect(plan).not.toBeNull();
				expect(plan?.id).toBe(proPlan.id);
			});
		});

		it('returns null for unknown ID', async () => {
			await withTestTransaction(async () => {
				const plan = await service.getPlanById(
					'00000000-0000-0000-0000-000000000000'
				);

				expect(plan).toBeNull();
			});
		});
	});

	describe('getPlanBySlug()', () => {
		it('returns plan for valid slug', async () => {
			await withTestTransaction(async () => {
				await createBillingTestEnvironment();

				const plan = await service.getPlanBySlug('free');

				expect(plan).not.toBeNull();
				expect(plan?.name).toBe('free');
			});
		});

		it('returns null for unknown slug', async () => {
			await withTestTransaction(async () => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const plan = await service.getPlanBySlug('enterprise' as any);

				expect(plan).toBeNull();
			});
		});
	});
});
