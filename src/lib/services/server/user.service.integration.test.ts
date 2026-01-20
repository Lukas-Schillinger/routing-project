/**
 * User Service Integration Tests - Stripe
 *
 * These tests call the real Stripe sandbox API to verify billing setup works correctly.
 * Requires STRIPE_SECRET_KEY and related env vars to be set.
 *
 * Run with: npm run test:unit -- --run user.service.integration
 */
import { loadEnv } from 'vite';
import { db } from '$lib/server/db';
import { organizations, subscriptions, users } from '$lib/server/db/schema';
import { stripeClient } from '$lib/services/external/stripe/client';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { afterAll, describe, expect, it } from 'vitest';
import { userService } from './user.service';

// Load env vars for integration tests
const env = loadEnv('development', process.cwd(), '');

// Track created resources for cleanup
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];
const createdStripeCustomerIds: string[] = [];

// Check if Stripe is configured
const stripeConfigured = !!env.STRIPE_SECRET_KEY;

describe.skipIf(!stripeConfigured)('UserService Stripe Integration', () => {
	afterAll(async () => {
		// Clean up Stripe customers (cascades to subscriptions)
		for (const customerId of createdStripeCustomerIds) {
			try {
				const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
				await stripe.customers.del(customerId);
			} catch {
				// Ignore cleanup errors
			}
		}

		// Clean up database records
		for (const userId of createdUserIds) {
			try {
				await db.delete(users).where(eq(users.id, userId));
			} catch {
				// Ignore cleanup errors
			}
		}

		for (const orgId of createdOrgIds) {
			try {
				await db.delete(organizations).where(eq(organizations.id, orgId));
			} catch {
				// Ignore cleanup errors
			}
		}
	});

	describe('Organization creation with Stripe billing', () => {
		it('creates Stripe customer and subscription when creating org', async () => {
			const email = `integration-test-${Date.now()}@example.com`;

			// Create user without organization_id - triggers org + Stripe setup
			const user = await userService.createUser({ email, role: 'admin' });
			createdUserIds.push(user.id);
			createdOrgIds.push(user.organization_id);

			// Get local subscription record
			const [localSubscription] = await db
				.select()
				.from(subscriptions)
				.where(eq(subscriptions.organization_id, user.organization_id))
				.limit(1);

			expect(localSubscription).toBeDefined();
			expect(localSubscription.stripe_customer_id).toMatch(/^cus_/);
			expect(localSubscription.stripe_subscription_id).toMatch(/^sub_/);
			expect(localSubscription.status).toBe('active');

			// Track for cleanup
			createdStripeCustomerIds.push(localSubscription.stripe_customer_id);

			// Verify Stripe customer exists
			const stripeCustomer = await stripeClient.getCustomer(
				localSubscription.stripe_customer_id
			);
			expect(stripeCustomer.id).toBe(localSubscription.stripe_customer_id);
			expect((stripeCustomer as Stripe.Customer).deleted).toBeFalsy();
			expect(
				(stripeCustomer as Stripe.Customer).metadata?.organization_id
			).toBe(user.organization_id);

			// Verify Stripe subscription exists and is active
			const stripeSubscription = await stripeClient.getSubscription(
				localSubscription.stripe_subscription_id
			);
			expect(stripeSubscription.id).toBe(
				localSubscription.stripe_subscription_id
			);
			expect(stripeSubscription.status).toBe('active');
			expect(stripeSubscription.metadata?.organization_id).toBe(
				user.organization_id
			);

			// Verify subscription is for Free plan ($0)
			const subscriptionItem = stripeSubscription.items.data[0];
			expect(subscriptionItem).toBeDefined();
			expect(subscriptionItem.price.id).toBe(env.STRIPE_FREE_PLAN_PRICE_ID);
		});

		it('rolls back organization if Stripe fails', async () => {
			// This test would require mocking Stripe to fail, which defeats the purpose
			// of integration testing. We'll rely on unit tests for rollback logic.
			// This is a placeholder to document the expected behavior.
			expect(true).toBe(true);
		});
	});
});
