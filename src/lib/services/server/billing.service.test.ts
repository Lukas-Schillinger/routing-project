import { billingConfig } from '$lib/config/billing';
import { db } from '$lib/server/db';
import { creditTransactions, organizations } from '$lib/server/db/schema';
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
 * Tests derived credit balance calculation, purchased credits, usage recording, and idempotency.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

describe('BillingService', () => {
	describe('getAvailableCredits()', () => {
		it('returns plan monthly credits for org with no transactions', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				// With derived credits, available = monthlyCredits - 0 usage + 0 purchased
				expect(credits).toBe(billingConfig.freeMonthlyCredits);
			});
		});

		it('adds purchased credits to plan allowance', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await db.insert(creditTransactions).values({
					organization_id: organization.id,
					type: 'purchase',
					amount: 100,
					expires_at: null
				});

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				// monthlyCredits + 100 purchased
				expect(credits).toBe(billingConfig.freeMonthlyCredits + 100);
			});
		});

		it('subtracts usage from balance', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createBillingTestEnvironment();

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

				await billingService.recordUsage(organization.id, 50, job.id);

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				// monthlyCredits - 50 usage
				expect(credits).toBe(billingConfig.freeMonthlyCredits - 50);
			});
		});

		it('combines purchased credits and usage correctly', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createBillingTestEnvironment();

				// Purchase credits
				await db.insert(creditTransactions).values({
					organization_id: organization.id,
					type: 'purchase',
					amount: 100,
					expires_at: null
				});

				// Record usage
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

				await billingService.recordUsage(organization.id, 30, job.id);

				const credits = await billingService.getAvailableCredits(
					organization.id
				);

				// monthlyCredits - 30 usage + 100 purchased
				expect(credits).toBe(billingConfig.freeMonthlyCredits - 30 + 100);
			});
		});
	});

	describe('hasCredits()', () => {
		it('returns true when plan credits sufficient', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// Free plan has 200 monthly credits
				const hasEnough = await billingService.hasCredits(organization.id, 100);

				expect(hasEnough).toBe(true);
			});
		});

		it('returns false when insufficient credits', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// Free plan has 200 monthly credits, requesting more
				const hasEnough = await billingService.hasCredits(organization.id, 300);

				expect(hasEnough).toBe(false);
			});
		});

		it('returns true when credits exactly match required', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const hasEnough = await billingService.hasCredits(
					organization.id,
					billingConfig.freeMonthlyCredits
				);

				expect(hasEnough).toBe(true);
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

		it('is idempotent - throws conflict for same payment intent', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				await billingService.grantPurchasedCredits(
					organization.id,
					500,
					'pi_test_456'
				);

				await expect(
					billingService.grantPurchasedCredits(
						organization.id,
						500,
						'pi_test_456'
					)
				).rejects.toThrow('Duplicate credit grant');

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

		it('is idempotent - throws conflict for same job', async () => {
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

				await expect(
					billingService.recordUsage(organization.id, 25, job.id)
				).rejects.toThrow('Duplicate usage record');

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

				await db.insert(creditTransactions).values([
					{
						organization_id: organization.id,
						type: 'purchase',
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
						type: 'purchase',
						amount: 100
					},
					{
						organization_id: organization.id,
						type: 'purchase',
						amount: 100
					},
					{
						organization_id: organization.id,
						type: 'purchase',
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
		it('returns derived balance from plan', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const balance = await billingService.getCreditBalance(organization.id);

				expect(balance.available).toBe(billingConfig.freeMonthlyCredits);
			});
		});

		it('includes purchased credits in balance', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				await db.insert(creditTransactions).values({
					organization_id: organization.id,
					type: 'purchase',
					amount: 100,
					expires_at: null
				});

				const balance = await billingService.getCreditBalance(organization.id);

				expect(balance.available).toBe(billingConfig.freeMonthlyCredits + 100);
			});
		});
	});

	describe('getBillingInfo()', () => {
		it('returns billing info for a free org', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				const result = await billingService.getBillingInfo(organization.id);

				expect(result.plan).toBe('free');
				expect(result.monthlyCredits).toBe(billingConfig.freeMonthlyCredits);
				expect(result.organization.id).toBe(organization.id);
				expect(result.periodStartsAt).toBeInstanceOf(Date);
				expect(result.periodEndsAt).toBeInstanceOf(Date);
			});
		});

		it('returns billing info for a pro org', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createBillingTestEnvironment();

				// Set org to pro by adding an active subscription
				await db
					.update(organizations)
					.set({
						stripe_subscription_id: 'sub_test_123',
						subscription_status: 'active',
						billing_period_starts_at: new Date('2026-02-01T00:00:00Z'),
						billing_period_ends_at: new Date('2026-03-01T00:00:00Z')
					})
					.where(eq(organizations.id, organization.id));

				const result = await billingService.getBillingInfo(organization.id);

				expect(result.plan).toBe('pro');
				expect(result.monthlyCredits).toBe(billingConfig.proMonthlyCredits);
			});
		});

		it('throws not found for non-existent org', async () => {
			await withTestTransaction(async () => {
				await expect(
					billingService.getBillingInfo('00000000-0000-0000-0000-000000000000')
				).rejects.toThrow('Organization not found');
			});
		});
	});
});
