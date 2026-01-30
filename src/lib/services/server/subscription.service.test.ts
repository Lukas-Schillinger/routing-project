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
 * Tests subscription management including upgrades, downgrades, and scheduling.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
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
	describe('upgradeToProPlan()', () => {
		it('creates checkout session and returns URL', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const result = await service.upgradeToProPlan(
					organization.id,
					'https://example.com'
				);

				expect(result.url).toContain('https://checkout.stripe.com');
				expect(mockStripeState.calls.createCheckoutSession).toHaveLength(1);
			});
		});

		it('creates checkout session with correct metadata', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription } =
					await createBillingTestEnvironment();

				await service.upgradeToProPlan(organization.id, 'https://example.com');

				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.mode).toBe('subscription');
				expect(call.metadata).toMatchObject({
					organization_id: organization.id,
					checkout_type: 'upgrade',
					existing_subscription_id: subscription.stripe_subscription_id
				});
			});
		});

		it('uses default returnUrl of /settings/billing when not provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await service.upgradeToProPlan(organization.id, 'https://example.com');

				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.success_url).toBe('https://example.com/settings/billing');
				expect(call.cancel_url).toBe('https://example.com/settings/billing');
			});
		});

		it('uses custom returnUrl when provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await service.upgradeToProPlan(
					organization.id,
					'https://example.com',
					'/dashboard'
				);

				const call = mockStripeState.calls.createCheckoutSession[0];
				expect(call.success_url).toBe('https://example.com/dashboard');
				expect(call.cancel_url).toBe('https://example.com/dashboard');
			});
		});

		it('throws not found if subscription does not exist', async () => {
			await withTestTransaction(async () => {
				await expect(
					service.upgradeToProPlan(
						'00000000-0000-0000-0000-000000000000',
						'https://example.com'
					)
				).rejects.toMatchObject({ code: 'NOT_FOUND' });
			});
		});

		it('throws conflict if already on Pro plan', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan } =
					await createBillingTestEnvironment();

				// Set subscription to Pro plan
				await db
					.update(subscriptions)
					.set({ plan_id: proPlan.id })
					.where(eq(subscriptions.id, subscription.id));

				await expect(
					service.upgradeToProPlan(organization.id, 'https://example.com')
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

	describe('getScheduledDowngrade()', () => {
		it('returns scheduled downgrade info', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan, freePlan } =
					await createBillingTestEnvironment();

				await db
					.update(subscriptions)
					.set({
						plan_id: proPlan.id,
						stripe_schedule_id: 'sched_test',
						scheduled_plan_id: freePlan.id
					})
					.where(eq(subscriptions.id, subscription.id));

				const result = await service.getScheduledDowngrade(organization.id);

				expect(result).not.toBeNull();
				expect(result?.scheduledPlanId).toBe(freePlan.id);
			});
		});

		it('returns null when no schedule exists', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const result = await service.getScheduledDowngrade(organization.id);

				expect(result).toBeNull();
			});
		});
	});

	describe('clearScheduledChange()', () => {
		it('clears scheduled change tracking', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, freePlan } =
					await createBillingTestEnvironment();

				await db
					.update(subscriptions)
					.set({
						stripe_schedule_id: 'sched_to_clear',
						scheduled_plan_id: freePlan.id
					})
					.where(eq(subscriptions.id, subscription.id));

				await service.clearScheduledChange(organization.id);

				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.stripe_schedule_id).toBeNull();
				expect(updated.scheduled_plan_id).toBeNull();
			});
		});
	});

	describe('scheduleDowngrade()', () => {
		it('creates subscription schedule for downgrade from Pro', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan, freePlan } =
					await createBillingTestEnvironment();

				// Set subscription to Pro plan with a mock Stripe subscription
				const mockSubId = 'sub_mock_downgrade_test';
				await db
					.update(subscriptions)
					.set({
						plan_id: proPlan.id,
						stripe_subscription_id: mockSubId
					})
					.where(eq(subscriptions.id, subscription.id));

				// Add the subscription to mock state so createSubscriptionSchedule can find it
				const now = Math.floor(Date.now() / 1000);
				const oneMonthFromNow = now + 30 * 24 * 60 * 60;
				mockStripeState.subscriptions.push({
					id: mockSubId,
					customer: subscription.stripe_customer_id,
					status: 'active',
					schedule: null,
					items: {
						data: [
							{
								id: 'si_mock',
								price: { id: proPlan.stripe_price_id },
								current_period_start: now,
								current_period_end: oneMonthFromNow
							}
						]
					},
					metadata: { organization_id: organization.id }
				});

				const effectiveDate = await service.scheduleDowngrade(organization.id);

				expect(effectiveDate).toBeInstanceOf(Date);
				expect(mockStripeState.calls.createSubscriptionSchedule).toHaveLength(
					1
				);
				expect(mockStripeState.calls.updateSubscriptionSchedule).toHaveLength(
					1
				);

				// Verify local record updated
				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.stripe_schedule_id).not.toBeNull();
				expect(updated.scheduled_plan_id).toBe(freePlan.id);
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

				// Set subscription to Pro plan with existing schedule
				await db
					.update(subscriptions)
					.set({
						plan_id: proPlan.id,
						stripe_schedule_id: 'sched_existing'
					})
					.where(eq(subscriptions.id, subscription.id));

				await expect(
					service.scheduleDowngrade(organization.id)
				).rejects.toThrow('already scheduled');
			});
		});
	});

	describe('cancelScheduledDowngrade()', () => {
		it('cancels scheduled downgrade', async () => {
			await withTestTransaction(async () => {
				const { organization, subscription, proPlan, freePlan } =
					await createBillingTestEnvironment();

				const scheduleId = 'sched_to_cancel';

				// Set subscription with scheduled downgrade
				await db
					.update(subscriptions)
					.set({
						plan_id: proPlan.id,
						stripe_schedule_id: scheduleId,
						scheduled_plan_id: freePlan.id
					})
					.where(eq(subscriptions.id, subscription.id));

				// Add schedule to mock state
				mockStripeState.schedules.push({
					id: scheduleId,
					subscription: subscription.stripe_subscription_id,
					phases: [
						{
							items: [{ price: proPlan.stripe_price_id }],
							start_date: Math.floor(Date.now() / 1000),
							end_date: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
						}
					]
				});

				await service.cancelScheduledDowngrade(organization.id);

				expect(mockStripeState.calls.cancelSubscriptionSchedule).toHaveLength(
					1
				);
				expect(
					mockStripeState.calls.cancelSubscriptionSchedule[0].scheduleId
				).toBe(scheduleId);

				// Verify local record cleared
				const [updated] = await db
					.select()
					.from(subscriptions)
					.where(eq(subscriptions.organization_id, organization.id));

				expect(updated.stripe_schedule_id).toBeNull();
				expect(updated.scheduled_plan_id).toBeNull();
			});
		});

		it('throws conflict if no downgrade scheduled', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// No schedule set
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
});
