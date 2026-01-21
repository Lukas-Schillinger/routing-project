/**
 * Stripe Test Clock Utilities
 *
 * For integration tests that need to simulate time-based subscription events.
 * These use the REAL Stripe API (test mode) to create and manipulate test clocks.
 *
 * IMPORTANT: Only use in integration tests, not unit tests.
 * Requires STRIPE_SECRET_KEY to be set to a test mode key (sk_test_*).
 *
 * @example
 * ```ts
 * import { createStripeTestClock, requireStripeTestKey } from '$lib/testing/stripe/test-clocks';
 *
 * describe('Subscription Renewal Integration', () => {
 *   let testClock: StripeTestClockHelper;
 *
 *   beforeAll(async () => {
 *     requireStripeTestKey();
 *     testClock = await createStripeTestClock('Renewal Test');
 *   });
 *
 *   afterAll(async () => {
 *     await testClock.delete();
 *   });
 *
 *   it('grants credits on subscription renewal', async () => {
 *     const customer = await testClock.createCustomer(orgId);
 *     const subscription = await testClock.createSubscription(
 *       customer.id,
 *       priceId,
 *       orgId
 *     );
 *
 *     // Advance time by 30 days to trigger renewal
 *     await testClock.advanceDays(30);
 *
 *     // Verify credits were granted (check database)
 *   });
 * });
 * ```
 */
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export type StripeTestClockHelper = {
	/** The test clock ID */
	id: string;

	/** Current frozen time */
	frozenTime: Date;

	/**
	 * Advance time by the specified number of seconds.
	 * This triggers any subscription events that would occur in that time.
	 */
	advanceTime: (seconds: number) => Promise<void>;

	/**
	 * Advance time by the specified number of days.
	 * Convenience wrapper for advanceTime.
	 */
	advanceDays: (days: number) => Promise<void>;

	/**
	 * Create a customer attached to this test clock.
	 * Customers created with a test clock can have their time manipulated.
	 */
	createCustomer: (organizationId: string) => Promise<Stripe.Customer>;

	/**
	 * Create a subscription for a customer on this test clock.
	 */
	createSubscription: (
		customerId: string,
		priceId: string,
		organizationId: string
	) => Promise<Stripe.Subscription>;

	/**
	 * Delete the test clock and clean up.
	 * Always call this in afterAll to avoid leaving test clocks behind.
	 */
	delete: () => Promise<void>;
};

/**
 * Create a Stripe test clock for time-based testing.
 *
 * @param name - A descriptive name for the test clock (shown in Stripe Dashboard)
 * @param frozenTime - Optional initial time (defaults to now)
 */
export async function createStripeTestClock(
	name: string,
	frozenTime?: Date
): Promise<StripeTestClockHelper> {
	requireStripeTestKey();

	const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
	const initialTime = frozenTime ?? new Date();

	const testClock = await stripe.testHelpers.testClocks.create({
		frozen_time: Math.floor(initialTime.getTime() / 1000),
		name
	});

	let currentFrozenTime = new Date(testClock.frozen_time * 1000);

	// Define advanceTime before using it in advanceDays
	const advanceTime = async (seconds: number) => {
		const newTime = Math.floor(currentFrozenTime.getTime() / 1000) + seconds;
		await stripe.testHelpers.testClocks.advance(testClock.id, {
			frozen_time: newTime
		});
		currentFrozenTime = new Date(newTime * 1000);
	};

	return {
		id: testClock.id,

		get frozenTime() {
			return currentFrozenTime;
		},

		advanceTime,

		async advanceDays(days: number) {
			await advanceTime(days * 24 * 60 * 60);
		},

		async createCustomer(organizationId: string) {
			return stripe.customers.create({
				test_clock: testClock.id,
				metadata: { organization_id: organizationId }
			});
		},

		async createSubscription(
			customerId: string,
			priceId: string,
			organizationId: string
		) {
			return stripe.subscriptions.create({
				customer: customerId,
				items: [{ price: priceId }],
				metadata: { organization_id: organizationId }
			});
		},

		async delete() {
			try {
				await stripe.testHelpers.testClocks.del(testClock.id);
			} catch (error) {
				// Ignore errors if the test clock was already deleted
				console.warn(`Failed to delete test clock ${testClock.id}:`, error);
			}
		}
	};
}

/**
 * Assert that a valid Stripe test mode key is available.
 * Throws an error if not, which will skip the test in most test runners.
 */
export function requireStripeTestKey(): void {
	const key = env.STRIPE_SECRET_KEY;
	if (!key) {
		throw new Error(
			'Stripe integration tests require STRIPE_SECRET_KEY environment variable'
		);
	}
	if (!key.startsWith('sk_test_')) {
		throw new Error(
			'Stripe integration tests require a TEST mode secret key (sk_test_*), not a live key'
		);
	}
}

/**
 * Check if a Stripe test key is available without throwing.
 * Useful for conditionally skipping tests.
 */
export function hasStripeTestKey(): boolean {
	const key = env.STRIPE_SECRET_KEY;
	return !!key && key.startsWith('sk_test_');
}
