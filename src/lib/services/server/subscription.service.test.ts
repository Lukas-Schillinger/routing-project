import { db } from '$lib/server/db';
import { organizations, subscriptions } from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createMockStripeSubscription,
	mockStripeClient,
	mockStripeState,
	type TestTransaction
} from '$lib/testing';
import { billingConfig } from '$lib/config/billing';
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
import { SubscriptionService } from './subscription.service';
import { ServiceError } from './errors';

/**
 * Subscription Service Tests
 *
 * Tests subscription management including upgrades, downgrades, and scheduling.
 */

// Mock the Stripe client module
vi.mock('$lib/services/external/stripe/client', () => ({
	stripeClient: mockStripeClient
}));

let service: SubscriptionService;
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
	// Cast mock to expected type (mock has all required methods but not private class properties)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	service = new SubscriptionService(mockStripeClient as any);

	const tx = db as unknown as TestTransaction;
	const env = await createBillingTestEnvironment(tx);

	testOrg = env.organization;
	createdOrgIds.push(testOrg.id);
	freePlan = env.freePlan;
	proPlan = env.proPlan;
	testSubscription = env.subscription;
});

afterAll(async () => {
	// Clean up in reverse dependency order
	// Note: Plans are NOT deleted - they're shared across tests
	for (const orgId of createdOrgIds) {
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

	// Reset subscription to Free plan for each test
	await db
		.update(subscriptions)
		.set({
			plan_id: freePlan.id,
			stripe_schedule_id: null,
			scheduled_plan_id: null
		})
		.where(eq(subscriptions.organization_id, testOrg.id));
});

describe('SubscriptionService', () => {
	describe('createUpgradeCheckoutSession()', () => {
		it('creates checkout session for upgrade', async () => {
			const url = await service.createUpgradeCheckoutSession(
				testOrg.id,
				'https://example.com'
			);

			expect(url).toContain('https://checkout.stripe.com');
			expect(mockStripeState.calls.createCheckoutSession).toHaveLength(1);
		});

		it('throws not found if subscription does not exist', async () => {
			await expect(
				service.createUpgradeCheckoutSession(
					'00000000-0000-0000-0000-000000000000',
					'https://example.com'
				)
			).rejects.toThrow(ServiceError);
		});

		it('throws conflict if already on Pro plan', async () => {
			// Set subscription to Pro plan
			await db
				.update(subscriptions)
				.set({ plan_id: proPlan.id })
				.where(eq(subscriptions.organization_id, testOrg.id));

			await expect(
				service.createUpgradeCheckoutSession(testOrg.id, 'https://example.com')
			).rejects.toThrow('already on Pro plan');
		});
	});

	describe('createCreditPurchaseSession()', () => {
		it('creates checkout session for credit purchase', async () => {
			const url = await service.createCreditPurchaseSession(
				testOrg.id,
				500,
				'https://example.com'
			);

			expect(url).toContain('https://checkout.stripe.com');
			expect(mockStripeState.calls.createCheckoutSession).toHaveLength(1);
		});

		it('throws validation error for purchase below minimum', async () => {
			await expect(
				service.createCreditPurchaseSession(
					testOrg.id,
					billingConfig.minCreditPurchase - 1,
					'https://example.com'
				)
			).rejects.toThrow('Minimum credit purchase');
		});
	});

	describe('createBillingPortalSession()', () => {
		it('creates billing portal session', async () => {
			const url = await service.createBillingPortalSession(
				testOrg.id,
				'https://example.com'
			);

			expect(url).toContain('https://billing.stripe.com');
			expect(mockStripeState.calls.createBillingPortalSession).toHaveLength(1);
		});
	});

	describe('syncSubscription()', () => {
		it('creates or updates local subscription from Stripe', async () => {
			const now = Math.floor(Date.now() / 1000);
			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_sync_test',
				customer: testSubscription.stripe_customer_id,
				organizationId: testOrg.id,
				priceId: proPlan.stripe_price_id,
				status: 'active',
				periodStart: now,
				periodEnd: now + 30 * 24 * 60 * 60
			});

			await service.syncSubscription(stripeSubscription);

			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.stripe_subscription_id).toBe('sub_sync_test');
			expect(updated.status).toBe('active');
			expect(updated.plan_id).toBe(proPlan.id);
		});

		it('throws error when organization_id missing from metadata', async () => {
			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_no_org',
				organizationId: ''
			});
			stripeSubscription.metadata = {};

			await expect(
				service.syncSubscription(stripeSubscription)
			).rejects.toThrow('organization_id');
		});

		it('throws error when price ID not found', async () => {
			const stripeSubscription = createMockStripeSubscription({
				id: 'sub_unknown_price',
				organizationId: testOrg.id,
				priceId: 'price_unknown_xyz'
			});

			await expect(
				service.syncSubscription(stripeSubscription)
			).rejects.toThrow('Plan not found');
		});
	});

	describe('getScheduledDowngrade()', () => {
		it('returns scheduled downgrade info', async () => {
			await db
				.update(subscriptions)
				.set({
					plan_id: proPlan.id,
					stripe_schedule_id: 'sched_test',
					scheduled_plan_id: freePlan.id
				})
				.where(eq(subscriptions.organization_id, testOrg.id));

			const result = await service.getScheduledDowngrade(testOrg.id);

			expect(result).not.toBeNull();
			expect(result?.scheduledPlanId).toBe(freePlan.id);
		});

		it('returns null when no schedule exists', async () => {
			const result = await service.getScheduledDowngrade(testOrg.id);

			expect(result).toBeNull();
		});
	});

	describe('clearScheduledChange()', () => {
		it('clears scheduled change tracking', async () => {
			await db
				.update(subscriptions)
				.set({
					stripe_schedule_id: 'sched_to_clear',
					scheduled_plan_id: freePlan.id
				})
				.where(eq(subscriptions.organization_id, testOrg.id));

			await service.clearScheduledChange(testOrg.id);

			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.stripe_schedule_id).toBeNull();
			expect(updated.scheduled_plan_id).toBeNull();
		});
	});

	describe('scheduleDowngrade()', () => {
		it('creates subscription schedule for downgrade from Pro', async () => {
			// Set subscription to Pro plan with a mock Stripe subscription
			const mockSubId = 'sub_mock_downgrade_test';
			await db
				.update(subscriptions)
				.set({
					plan_id: proPlan.id,
					stripe_subscription_id: mockSubId
				})
				.where(eq(subscriptions.organization_id, testOrg.id));

			// Add the subscription to mock state so createSubscriptionSchedule can find it
			const now = Math.floor(Date.now() / 1000);
			const oneMonthFromNow = now + 30 * 24 * 60 * 60;
			mockStripeState.subscriptions.push({
				id: mockSubId,
				customer: testSubscription.stripe_customer_id,
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
				metadata: { organization_id: testOrg.id }
			});

			const effectiveDate = await service.scheduleDowngrade(testOrg.id);

			expect(effectiveDate).toBeInstanceOf(Date);
			expect(mockStripeState.calls.createSubscriptionSchedule).toHaveLength(1);
			expect(mockStripeState.calls.updateSubscriptionSchedule).toHaveLength(1);

			// Verify local record updated
			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.stripe_schedule_id).not.toBeNull();
			expect(updated.scheduled_plan_id).toBe(freePlan.id);
		});

		it('throws conflict if already on Free plan', async () => {
			// Subscription is already on Free plan (default from beforeEach)
			await expect(service.scheduleDowngrade(testOrg.id)).rejects.toThrow(
				'already on Free plan'
			);
		});

		it('throws conflict if downgrade already scheduled', async () => {
			// Set subscription to Pro plan with existing schedule
			await db
				.update(subscriptions)
				.set({
					plan_id: proPlan.id,
					stripe_schedule_id: 'sched_existing'
				})
				.where(eq(subscriptions.organization_id, testOrg.id));

			await expect(service.scheduleDowngrade(testOrg.id)).rejects.toThrow(
				'already scheduled'
			);
		});
	});

	describe('cancelScheduledDowngrade()', () => {
		it('cancels scheduled downgrade', async () => {
			const scheduleId = 'sched_to_cancel';

			// Set subscription with scheduled downgrade
			await db
				.update(subscriptions)
				.set({
					plan_id: proPlan.id,
					stripe_schedule_id: scheduleId,
					scheduled_plan_id: freePlan.id
				})
				.where(eq(subscriptions.organization_id, testOrg.id));

			// Add schedule to mock state
			mockStripeState.schedules.push({
				id: scheduleId,
				subscription: testSubscription.stripe_subscription_id,
				phases: [
					{
						items: [{ price: proPlan.stripe_price_id }],
						start_date: Math.floor(Date.now() / 1000),
						end_date: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
					}
				]
			});

			await service.cancelScheduledDowngrade(testOrg.id);

			expect(mockStripeState.calls.cancelSubscriptionSchedule).toHaveLength(1);
			expect(
				mockStripeState.calls.cancelSubscriptionSchedule[0].scheduleId
			).toBe(scheduleId);

			// Verify local record cleared
			const [updated] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, testOrg.id));

			expect(updated.stripe_schedule_id).toBeNull();
			expect(updated.scheduled_plan_id).toBeNull();
		});

		it('throws conflict if no downgrade scheduled', async () => {
			// No schedule set (default from beforeEach)
			await expect(
				service.cancelScheduledDowngrade(testOrg.id)
			).rejects.toThrow('No plan change is scheduled');
		});
	});

	describe('getPlanByPriceId()', () => {
		it('returns plan for valid price ID', async () => {
			const plan = await service.getPlanByPriceId(proPlan.stripe_price_id);

			expect(plan).not.toBeNull();
			expect(plan?.id).toBe(proPlan.id);
		});

		it('returns null for unknown price ID', async () => {
			const plan = await service.getPlanByPriceId('price_unknown');

			expect(plan).toBeNull();
		});
	});

	describe('getPlanFromStripeSubscription()', () => {
		it('returns plan for valid Stripe subscription', async () => {
			const stripeSubscription = createMockStripeSubscription({
				priceId: proPlan.stripe_price_id
			});

			const plan =
				await service.getPlanFromStripeSubscription(stripeSubscription);

			expect(plan).not.toBeNull();
			expect(plan?.id).toBe(proPlan.id);
		});

		it('returns null when subscription has no items', async () => {
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

	describe('getPlanById()', () => {
		it('returns plan for valid ID', async () => {
			const plan = await service.getPlanById(proPlan.id);

			expect(plan).not.toBeNull();
			expect(plan?.id).toBe(proPlan.id);
		});

		it('returns null for unknown ID', async () => {
			const plan = await service.getPlanById(
				'00000000-0000-0000-0000-000000000000'
			);

			expect(plan).toBeNull();
		});
	});
});
