import { db } from '$lib/server/db';
import { creditTransactions } from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createDepot,
	createLocation,
	createMap,
	createMatrix,
	createOptimizationJob,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { billingService } from './billing.service';

/**
 * Billing Service Tests
 *
 * Tests credit balance calculation, granting, usage recording, and idempotency.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

describe('BillingService', () => {
	describe('getAvailableCredits()', () => {
		it('returns 0 for org with no transactions', async () => {
			await withTestTransaction(async () => {
				// Use createTestEnvironment for clean slate without initial credits
				const { organization } = await createTestEnvironment();

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				expect(credits).toBe(0);
			});
		});

		it('sums positive credits correctly', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				// Grant some credits
				await db.insert(creditTransactions).values([
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 200,
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					},
					{
						organization_id: organization.id,
						type: 'purchase',
						amount: 100,
						expires_at: null
					}
				]);

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				expect(credits).toBe(300);
			});
		});

		it('subtracts usage from balance', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await db.insert(creditTransactions).values([
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 200,
						expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
					},
					{
						organization_id: organization.id,
						type: 'usage',
						amount: -50,
						expires_at: null
					}
				]);

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				expect(credits).toBe(150);
			});
		});

		it('excludes expired credits', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
				const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

				await db.insert(creditTransactions).values([
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 200,
						expires_at: pastDate // Expired
					},
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 100,
						expires_at: futureDate // Not expired
					},
					{
						organization_id: organization.id,
						type: 'purchase',
						amount: 50,
						expires_at: null // Never expires
					}
				]);

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				expect(credits).toBe(150); // 100 + 50, excluding expired 200
			});
		});
	});

	describe('hasCredits()', () => {
		it('returns true when sufficient credits available', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await db.insert(creditTransactions).values({
					organization_id: organization.id,
					type: 'subscription_grant',
					amount: 200,
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				const hasEnough = await billingService.hasCredits(organization.id, 100);

				expect(hasEnough).toBe(true);
			});
		});

		it('returns false when insufficient credits', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await db.insert(creditTransactions).values({
					organization_id: organization.id,
					type: 'subscription_grant',
					amount: 50,
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				const hasEnough = await billingService.hasCredits(organization.id, 100);

				expect(hasEnough).toBe(false);
			});
		});

		it('returns true when credits exactly match required', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await db.insert(creditTransactions).values({
					organization_id: organization.id,
					type: 'subscription_grant',
					amount: 100,
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				});

				const hasEnough = await billingService.hasCredits(organization.id, 100);

				expect(hasEnough).toBe(true);
			});
		});
	});

	describe('grantSubscriptionCredits()', () => {
		it('creates credit transaction with correct type and expiration', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

				await billingService.grantSubscriptionCredits(
					organization.id,
					200,
					expiresAt,
					'in_test_123',
					'Test grant'
				);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].type).toBe('subscription_grant');
				expect(transactions[0].amount).toBe(200);
				expect(transactions[0].description).toBe('Test grant');
				expect(transactions[0].expires_at?.getTime()).toBe(expiresAt.getTime());
				expect(transactions[0].stripe_invoice_id).toBe('in_test_123');
			});
		});

		it('is idempotent - does not double-grant for same invoice', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

				await billingService.grantSubscriptionCredits(
					organization.id,
					200,
					expiresAt,
					'in_test_456'
				);
				await billingService.grantSubscriptionCredits(
					organization.id,
					200,
					expiresAt,
					'in_test_456'
				);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].amount).toBe(200);
			});
		});
	});

	describe('grantPurchasedCredits()', () => {
		it('creates credit transaction with no expiration', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await billingService.grantPurchasedCredits(
					organization.id,
					500,
					'pi_test_123',
					'Purchased credits'
				);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].type).toBe('purchase');
				expect(transactions[0].amount).toBe(500);
				expect(transactions[0].expires_at).toBeNull();
				expect(transactions[0].stripe_payment_intent_id).toBe('pi_test_123');
			});
		});

		it('is idempotent - does not double-grant for same payment intent', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await billingService.grantPurchasedCredits(
					organization.id,
					500,
					'pi_test_456'
				);
				await billingService.grantPurchasedCredits(
					organization.id,
					500,
					'pi_test_456'
				);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].amount).toBe(500);
			});
		});
	});

	describe('recordUsage()', () => {
		it('creates negative credit transaction', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});

				const job = await createOptimizationJob({
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					organization_id: organization.id,
					created_by: user.id,
					status: 'completed'
				});

				await billingService.recordUsage(
					organization.id,
					25,
					job.id,
					'Test usage'
				);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].type).toBe('usage');
				expect(transactions[0].amount).toBe(-25);
				expect(transactions[0].optimization_job_id).toBe(job.id);
			});
		});

		it('ensures amount is negative even if passed as positive', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});

				const job = await createOptimizationJob({
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					organization_id: organization.id,
					created_by: user.id,
					status: 'completed'
				});

				await billingService.recordUsage(organization.id, 25, job.id);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions[0].amount).toBe(-25);
			});
		});

		it('is idempotent - does not double-charge for same job', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const map = await createMap({
					organization_id: organization.id,
					created_by: user.id
				});
				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});
				const location = await createLocation({
					organization_id: organization.id
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id
				});

				const job = await createOptimizationJob({
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					organization_id: organization.id,
					created_by: user.id,
					status: 'completed'
				});

				await billingService.recordUsage(organization.id, 25, job.id);
				await billingService.recordUsage(organization.id, 25, job.id);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
			});
		});
	});

	describe('getTransactionHistory()', () => {
		it('returns transactions in descending order by date', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				// Insert transactions with different timestamps
				await db.insert(creditTransactions).values([
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 200
					},
					{
						organization_id: organization.id,
						type: 'usage',
						amount: -50
					},
					{
						organization_id: organization.id,
						type: 'purchase',
						amount: 100
					}
				]);

				const history = await billingService.getTransactionHistory(
					organization.id
				);

				expect(history).toHaveLength(3);
				// Verify ordering is descending by created_at
				for (let i = 1; i < history.length; i++) {
					expect(history[i - 1].created_at.getTime()).toBeGreaterThanOrEqual(
						history[i].created_at.getTime()
					);
				}
			});
		});

		it('respects limit parameter', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await db.insert(creditTransactions).values([
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 100
					},
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 100
					},
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 100
					}
				]);

				const history = await billingService.getTransactionHistory(
					organization.id,
					2
				);

				expect(history).toHaveLength(2);
			});
		});
	});

	describe('adjustCredits()', () => {
		it('creates adjustment transaction', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await billingService.adjustCredits(
					organization.id,
					50,
					'adjustment',
					'Goodwill credit'
				);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].type).toBe('adjustment');
				expect(transactions[0].amount).toBe(50);
				expect(transactions[0].description).toBe('Goodwill credit');
			});
		});

		it('creates refund transaction', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await billingService.adjustCredits(
					organization.id,
					100,
					'refund',
					'Refund for failed optimization'
				);

				const transactions = await db
					.select()
					.from(creditTransactions)
					.where(eq(creditTransactions.organization_id, organization.id));

				expect(transactions).toHaveLength(1);
				expect(transactions[0].type).toBe('refund');
			});
		});
	});

	describe('getCreditBalance()', () => {
		it('returns detailed balance with expiring credits', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

				await db.insert(creditTransactions).values([
					{
						organization_id: organization.id,
						type: 'subscription_grant',
						amount: 200,
						expires_at: futureDate
					},
					{
						organization_id: organization.id,
						type: 'purchase',
						amount: 100,
						expires_at: null
					}
				]);

				const balance = await billingService.getCreditBalance(organization.id);

				expect(balance.available).toBe(300);
				expect(balance.expiring).toBe(200);
				expect(balance.expiresAt).not.toBeNull();
			});
		});

		it('returns null expiresAt when no expiring credits', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await db.insert(creditTransactions).values({
					organization_id: organization.id,
					type: 'purchase',
					amount: 100,
					expires_at: null
				});

				const balance = await billingService.getCreditBalance(organization.id);

				expect(balance.available).toBe(100);
				expect(balance.expiring).toBe(0);
				expect(balance.expiresAt).toBeNull();
			});
		});
	});

	describe('getSubscription()', () => {
		it('returns subscription with plan details', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const result = await billingService.getSubscription(organization.id);

				expect(result.subscription).toBeDefined();
				expect(result.plan).toBeDefined();
				expect(result.subscription.organization_id).toBe(organization.id);
			});
		});

		it('throws not found for non-existent subscription', async () => {
			await withTestTransaction(async () => {
				await expect(
					billingService.getSubscription('00000000-0000-0000-0000-000000000000')
				).rejects.toThrow('Subscription not found');
			});
		});
	});
});
