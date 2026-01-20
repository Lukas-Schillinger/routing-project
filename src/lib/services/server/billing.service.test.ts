import { db } from '$lib/server/db';
import {
	creditTransactions,
	depots,
	locations,
	maps,
	matrices,
	optimizationJobs,
	organizations
} from '$lib/server/db/schema';
import {
	createDepot,
	createLocation,
	createMap,
	createMatrix,
	createOptimizationJob,
	createOrganization,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { billingService } from './billing.service';

/**
 * Billing Service Tests
 *
 * Tests credit balance calculation, granting, usage recording, and idempotency.
 */

let testOrg: { id: string; name: string };
let testUser: { id: string };
let testMap: { id: string };
let testMatrix: { id: string };
let testDepot: { id: string };
const createdOrgIds: string[] = [];
const createdJobIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;
	testOrg = await createOrganization(tx);
	createdOrgIds.push(testOrg.id);

	testUser = await createUser(tx, {
		organization_id: testOrg.id,
		role: 'admin'
	});

	testMap = await createMap(tx, {
		organization_id: testOrg.id,
		created_by: testUser.id
	});

	testMatrix = await createMatrix(tx, {
		organization_id: testOrg.id,
		map_id: testMap.id
	});

	const testLocation = await createLocation(tx, {
		organization_id: testOrg.id
	});

	testDepot = await createDepot(tx, {
		organization_id: testOrg.id,
		location_id: testLocation.id
	});
});

afterAll(async () => {
	// Clean up in reverse dependency order
	for (const jobId of createdJobIds) {
		await db.delete(optimizationJobs).where(eq(optimizationJobs.id, jobId));
	}
	for (const orgId of createdOrgIds) {
		await db
			.delete(creditTransactions)
			.where(eq(creditTransactions.organization_id, orgId));
	}
	for (const orgId of createdOrgIds) {
		await db.delete(matrices).where(eq(matrices.organization_id, orgId));
	}
	for (const orgId of createdOrgIds) {
		await db.delete(depots).where(eq(depots.organization_id, orgId));
	}
	for (const orgId of createdOrgIds) {
		await db.delete(locations).where(eq(locations.organization_id, orgId));
	}
	for (const orgId of createdOrgIds) {
		await db.delete(maps).where(eq(maps.organization_id, orgId));
	}
	for (const orgId of createdOrgIds) {
		await db.delete(organizations).where(eq(organizations.id, orgId));
	}
});

/** Helper to create a real optimization job for testing */
async function createTestJob(): Promise<string> {
	const tx = db as unknown as TestTransaction;
	const job = await createOptimizationJob(tx, {
		map_id: testMap.id,
		matrix_id: testMatrix.id,
		depot_id: testDepot.id,
		organization_id: testOrg.id,
		created_by: testUser.id,
		status: 'completed'
	});
	createdJobIds.push(job.id);
	return job.id;
}

beforeEach(async () => {
	// Clear credit transactions before each test
	await db
		.delete(creditTransactions)
		.where(eq(creditTransactions.organization_id, testOrg.id));
});

describe('BillingService', () => {
	describe('getAvailableCredits()', () => {
		it('returns 0 for org with no transactions', async () => {
			const credits = await billingService.getAvailableCredits(testOrg.id);
			expect(credits).toBe(0);
		});

		it('sums positive credits correctly', async () => {
			// Grant some credits
			await db.insert(creditTransactions).values([
				{
					organization_id: testOrg.id,
					type: 'subscription_grant',
					amount: 200,
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				},
				{
					organization_id: testOrg.id,
					type: 'purchase',
					amount: 100,
					expires_at: null
				}
			]);

			const credits = await billingService.getAvailableCredits(testOrg.id);
			expect(credits).toBe(300);
		});

		it('subtracts usage from balance', async () => {
			await db.insert(creditTransactions).values([
				{
					organization_id: testOrg.id,
					type: 'subscription_grant',
					amount: 200,
					expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
				},
				{
					organization_id: testOrg.id,
					type: 'usage',
					amount: -50,
					expires_at: null
				}
			]);

			const credits = await billingService.getAvailableCredits(testOrg.id);
			expect(credits).toBe(150);
		});

		it('excludes expired credits', async () => {
			const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
			const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

			await db.insert(creditTransactions).values([
				{
					organization_id: testOrg.id,
					type: 'subscription_grant',
					amount: 200,
					expires_at: pastDate // Expired
				},
				{
					organization_id: testOrg.id,
					type: 'subscription_grant',
					amount: 100,
					expires_at: futureDate // Not expired
				},
				{
					organization_id: testOrg.id,
					type: 'purchase',
					amount: 50,
					expires_at: null // Never expires
				}
			]);

			const credits = await billingService.getAvailableCredits(testOrg.id);
			expect(credits).toBe(150); // 100 + 50, excluding expired 200
		});
	});

	describe('hasCredits()', () => {
		it('returns true when sufficient credits available', async () => {
			await db.insert(creditTransactions).values({
				organization_id: testOrg.id,
				type: 'subscription_grant',
				amount: 200,
				expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			});

			const hasEnough = await billingService.hasCredits(testOrg.id, 100);
			expect(hasEnough).toBe(true);
		});

		it('returns false when insufficient credits', async () => {
			await db.insert(creditTransactions).values({
				organization_id: testOrg.id,
				type: 'subscription_grant',
				amount: 50,
				expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			});

			const hasEnough = await billingService.hasCredits(testOrg.id, 100);
			expect(hasEnough).toBe(false);
		});

		it('returns true when credits exactly match required', async () => {
			await db.insert(creditTransactions).values({
				organization_id: testOrg.id,
				type: 'subscription_grant',
				amount: 100,
				expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
			});

			const hasEnough = await billingService.hasCredits(testOrg.id, 100);
			expect(hasEnough).toBe(true);
		});
	});

	describe('grantSubscriptionCredits()', () => {
		it('creates credit transaction with correct type and expiration', async () => {
			const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

			await billingService.grantSubscriptionCredits(
				testOrg.id,
				200,
				expiresAt,
				'Test grant'
			);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].type).toBe('subscription_grant');
			expect(transactions[0].amount).toBe(200);
			expect(transactions[0].description).toBe('Test grant');
			expect(transactions[0].expires_at?.getTime()).toBe(expiresAt.getTime());
		});
	});

	describe('grantPurchasedCredits()', () => {
		it('creates credit transaction with no expiration', async () => {
			await billingService.grantPurchasedCredits(
				testOrg.id,
				500,
				'pi_test_123',
				'Purchased credits'
			);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].type).toBe('purchase');
			expect(transactions[0].amount).toBe(500);
			expect(transactions[0].expires_at).toBeNull();
			expect(transactions[0].stripe_payment_intent_id).toBe('pi_test_123');
		});

		it('is idempotent - does not double-grant for same payment intent', async () => {
			await billingService.grantPurchasedCredits(
				testOrg.id,
				500,
				'pi_test_456'
			);
			await billingService.grantPurchasedCredits(
				testOrg.id,
				500,
				'pi_test_456'
			);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].amount).toBe(500);
		});
	});

	describe('recordUsage()', () => {
		it('creates negative credit transaction', async () => {
			const jobId = await createTestJob();

			await billingService.recordUsage(testOrg.id, 25, jobId, 'Test usage');

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].type).toBe('usage');
			expect(transactions[0].amount).toBe(-25);
			expect(transactions[0].optimization_job_id).toBe(jobId);
		});

		it('ensures amount is negative even if passed as positive', async () => {
			const jobId = await createTestJob();

			await billingService.recordUsage(testOrg.id, 25, jobId);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions[0].amount).toBe(-25);
		});

		it('is idempotent - does not double-charge for same job', async () => {
			const jobId = await createTestJob();

			await billingService.recordUsage(testOrg.id, 25, jobId);
			await billingService.recordUsage(testOrg.id, 25, jobId);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
		});
	});

	describe('getTransactionHistory()', () => {
		it('returns transactions in descending order by date', async () => {
			// Insert transactions with different timestamps
			await db.insert(creditTransactions).values([
				{
					organization_id: testOrg.id,
					type: 'subscription_grant',
					amount: 200
				},
				{
					organization_id: testOrg.id,
					type: 'usage',
					amount: -50
				},
				{
					organization_id: testOrg.id,
					type: 'purchase',
					amount: 100
				}
			]);

			const history = await billingService.getTransactionHistory(testOrg.id);

			expect(history).toHaveLength(3);
			// Verify ordering is descending by created_at
			for (let i = 1; i < history.length; i++) {
				expect(history[i - 1].created_at.getTime()).toBeGreaterThanOrEqual(
					history[i].created_at.getTime()
				);
			}
		});

		it('respects limit parameter', async () => {
			await db.insert(creditTransactions).values([
				{
					organization_id: testOrg.id,
					type: 'subscription_grant',
					amount: 100
				},
				{
					organization_id: testOrg.id,
					type: 'subscription_grant',
					amount: 100
				},
				{ organization_id: testOrg.id, type: 'subscription_grant', amount: 100 }
			]);

			const history = await billingService.getTransactionHistory(testOrg.id, 2);

			expect(history).toHaveLength(2);
		});
	});

	describe('adjustCredits()', () => {
		it('creates adjustment transaction', async () => {
			await billingService.adjustCredits(
				testOrg.id,
				50,
				'adjustment',
				'Goodwill credit'
			);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].type).toBe('adjustment');
			expect(transactions[0].amount).toBe(50);
			expect(transactions[0].description).toBe('Goodwill credit');
		});

		it('creates refund transaction', async () => {
			await billingService.adjustCredits(
				testOrg.id,
				100,
				'refund',
				'Refund for failed optimization'
			);

			const transactions = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg.id));

			expect(transactions).toHaveLength(1);
			expect(transactions[0].type).toBe('refund');
		});
	});
});
