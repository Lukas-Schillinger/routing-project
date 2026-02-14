import { env } from '$env/dynamic/private';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	createStripeTestClock,
	hasStripeTestKey,
	type StripeTestClockHelper
} from '$lib/testing/stripe/test-clocks';

function getFreePlanPriceId(): string {
	const id = env.STRIPE_FREE_PLAN_PRICE_ID;
	if (!id) throw new Error('STRIPE_FREE_PLAN_PRICE_ID is not configured');
	return id;
}

function getProPlanPriceId(): string {
	const id = env.STRIPE_PRO_PLAN_PRICE_ID;
	if (!id) throw new Error('STRIPE_PRO_PLAN_PRICE_ID is not configured');
	return id;
}

describe.skipIf(!hasStripeTestKey())('Stripe Billing Integration', () => {
	describe('Subscription Creation', () => {
		let testClock: StripeTestClockHelper;

		beforeAll(async () => {
			testClock = await createStripeTestClock('Sub Creation Test');
		});

		afterAll(async () => {
			await testClock.delete();
		});

		it('creates a Free subscription with correct status and price', async () => {
			const customer = await testClock.createCustomer('org_test_create');
			const subscription = await testClock.createSubscription(
				customer.id,
				getFreePlanPriceId(),
				'org_test_create'
			);

			expect(subscription.status).toBe('active');
			expect(subscription.items.data[0].price.id).toBe(getFreePlanPriceId());
		});
	});

	describe('Upgrade Flow (Free → Pro)', () => {
		let testClock: StripeTestClockHelper;
		let customerId: string;
		let subscriptionId: string;

		beforeAll(async () => {
			testClock = await createStripeTestClock('Upgrade Flow Test');

			const customer = await testClock.createCustomer('org_test_upgrade');
			customerId = customer.id;
			await testClock.attachPaymentMethod(customerId);

			const subscription = await testClock.createSubscription(
				customerId,
				getFreePlanPriceId(),
				'org_test_upgrade'
			);
			subscriptionId = subscription.id;
		});

		afterAll(async () => {
			await testClock.delete();
		});

		it('upgrades in-place from Free to Pro', async () => {
			const freeSub = await testClock.getSubscription(subscriptionId);
			const itemId = freeSub.items.data[0].id;

			const updated = await testClock.updateSubscription(subscriptionId, {
				items: [{ id: itemId, price: getProPlanPriceId() }],
				proration_behavior: 'create_prorations'
			});

			expect(updated.status).toBe('active');
			expect(updated.items.data[0].price.id).toBe(getProPlanPriceId());
		});
	});

	describe('Downgrade Flow (Pro → Free)', () => {
		let testClock: StripeTestClockHelper;
		let subscriptionId: string;

		beforeAll(async () => {
			testClock = await createStripeTestClock('Downgrade Flow Test');

			const customer = await testClock.createCustomer('org_test_downgrade');
			await testClock.attachPaymentMethod(customer.id);

			const subscription = await testClock.createSubscription(
				customer.id,
				getProPlanPriceId(),
				'org_test_downgrade'
			);
			subscriptionId = subscription.id;
		});

		afterAll(async () => {
			await testClock.delete();
		});

		it('sets cancel_at_period_end and cancels after period ends', async () => {
			const updated = await testClock.updateSubscription(subscriptionId, {
				cancel_at_period_end: true
			});
			expect(updated.cancel_at_period_end).toBe(true);
			expect(updated.status).toBe('active');

			// Advance past the period end (polling handles waiting for clock to be ready)
			const periodEnd = updated.items.data[0].current_period_end;
			const now = Math.floor(testClock.frozenTime.getTime() / 1000);
			await testClock.advanceTime(periodEnd - now + 3600);

			const canceled = await testClock.getSubscription(subscriptionId);
			expect(canceled.status).toBe('canceled');
		});
	});

	describe('Payment Failure', () => {
		let testClock: StripeTestClockHelper;

		beforeAll(async () => {
			testClock = await createStripeTestClock('Payment Failure Test');
		});

		afterAll(async () => {
			await testClock.delete();
		});

		it('rejects subscription creation without a payment method', async () => {
			const customer = await testClock.createCustomer('org_test_decline');

			// Creating a paid subscription without a payment method should fail
			await expect(
				testClock.createSubscription(
					customer.id,
					getProPlanPriceId(),
					'org_test_decline'
				)
			).rejects.toThrow('no attached payment source or default payment method');
		});
	});

	describe('Subscription Renewal', () => {
		let testClock: StripeTestClockHelper;
		let customerId: string;
		let subscriptionId: string;

		beforeAll(async () => {
			testClock = await createStripeTestClock('Renewal Test');

			const customer = await testClock.createCustomer('org_test_renew');
			customerId = customer.id;
			await testClock.attachPaymentMethod(customer.id);

			const subscription = await testClock.createSubscription(
				customer.id,
				getProPlanPriceId(),
				'org_test_renew'
			);
			subscriptionId = subscription.id;
		});

		afterAll(async () => {
			await testClock.delete();
		});

		it('renews after billing period with new invoice paid', async () => {
			const original = await testClock.getSubscription(subscriptionId);
			const originalPeriodEnd = original.items.data[0].current_period_end;

			// Advance 31 days to trigger renewal (polling handles waiting for ready)
			await testClock.advanceDays(31);

			const renewed = await testClock.getSubscription(subscriptionId);
			expect(renewed.status).toBe('active');
			// After renewal, period_end should have advanced
			expect(renewed.items.data[0].current_period_end).toBeGreaterThan(
				originalPeriodEnd
			);

			// Verify renewal invoice was created and paid
			const invoices = await testClock.listInvoices(customerId);
			const renewalInvoice = invoices.find(
				(inv) =>
					inv.billing_reason === 'subscription_cycle' && inv.status === 'paid'
			);
			expect(renewalInvoice).toBeDefined();
		});
	});
});
