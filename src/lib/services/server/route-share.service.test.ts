import { db } from '$lib/server/db';
import {
	depots,
	drivers,
	locations,
	mailRecords,
	maps,
	organizations,
	routes,
	routeShares,
	subscriptions,
	users
} from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createOrganization,
	createRoute,
	createRouteShare,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ServiceError } from './errors';
import { routeShareService } from './route-share.service';

/**
 * Route Share Service Tests
 *
 * Tests cover:
 * - setMailRecordId (link mail record to share)
 */

// Test fixtures
let testOrg: { id: string };
let testUser: { id: string };
let testMap: { id: string };
let testDriver: { id: string };
let testDepot: { id: string };
let testLocation: { id: string };
let testRoute: { id: string };

// Track created IDs for cleanup
const createdMailRecordIds: string[] = [];
const createdShareIds: string[] = [];
const createdRouteIds: string[] = [];
const createdDepotIds: string[] = [];
const createdMapIds: string[] = [];
const createdLocationIds: string[] = [];
const createdDriverIds: string[] = [];
const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create org and its resources
	testOrg = await createOrganization(tx, { name: 'Route Share Test Org' });
	createdOrgIds.push(testOrg.id);

	testUser = await createUser(tx, {
		organization_id: testOrg.id,
		role: 'admin'
	});
	createdUserIds.push(testUser.id);

	testLocation = await createLocation(tx, { organization_id: testOrg.id });
	createdLocationIds.push(testLocation.id);

	testMap = await createMap(tx, { organization_id: testOrg.id });
	createdMapIds.push(testMap.id);

	testDriver = await createDriver(tx, {
		organization_id: testOrg.id,
		active: true
	});
	createdDriverIds.push(testDriver.id);

	testDepot = await createDepot(tx, {
		organization_id: testOrg.id,
		location_id: testLocation.id,
		default_depot: true
	});
	createdDepotIds.push(testDepot.id);

	testRoute = await createRoute(tx, {
		organization_id: testOrg.id,
		map_id: testMap.id,
		driver_id: testDriver.id,
		depot_id: testDepot.id
	});
	createdRouteIds.push(testRoute.id);
});

afterAll(async () => {
	// Clean up in correct FK order
	if (createdShareIds.length > 0) {
		await db
			.delete(routeShares)
			.where(inArray(routeShares.id, createdShareIds));
	}
	if (createdMailRecordIds.length > 0) {
		await db
			.delete(mailRecords)
			.where(inArray(mailRecords.id, createdMailRecordIds));
	}
	if (createdRouteIds.length > 0) {
		await db.delete(routes).where(inArray(routes.id, createdRouteIds));
	}
	if (createdDepotIds.length > 0) {
		await db.delete(depots).where(inArray(depots.id, createdDepotIds));
	}
	if (createdMapIds.length > 0) {
		await db.delete(maps).where(inArray(maps.id, createdMapIds));
	}
	if (createdLocationIds.length > 0) {
		await db.delete(locations).where(inArray(locations.id, createdLocationIds));
	}
	if (createdDriverIds.length > 0) {
		await db.delete(drivers).where(inArray(drivers.id, createdDriverIds));
	}
	if (createdUserIds.length > 0) {
		await db.delete(users).where(inArray(users.id, createdUserIds));
	}
	if (createdOrgIds.length > 0) {
		await db
			.delete(organizations)
			.where(inArray(organizations.id, createdOrgIds));
	}
});

describe('RouteShareService', () => {
	describe('setMailRecordId()', () => {
		it('updates mail_record_id on existing share', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a share without mail_record_id
			const share = await createRouteShare(tx, {
				organization_id: testOrg.id,
				route_id: testRoute.id,
				created_by: testUser.id
			});
			createdShareIds.push(share.id);

			// Create a mail record with all required fields
			const [mailRecord] = await db
				.insert(mailRecords)
				.values({
					organization_id: testOrg.id,
					resend_id: `test-resend-id-${Date.now()}-1`,
					type: 'route_share',
					to_email: 'test@example.com',
					from_email: 'noreply@example.com',
					status: 'delivered'
				})
				.returning();
			createdMailRecordIds.push(mailRecord.id);

			// Set the mail record ID on the share
			await routeShareService.setMailRecordId(share.id, mailRecord.id);

			// Verify the update
			const [updatedShare] = await db
				.select()
				.from(routeShares)
				.where(eq(routeShares.id, share.id))
				.limit(1);

			expect(updatedShare.mail_record_id).toBe(mailRecord.id);
		});

		it('does not throw for non-existent shareId', async () => {
			const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

			// Should not throw - just does an update that affects 0 rows
			await expect(
				routeShareService.setMailRecordId(NON_EXISTENT_UUID, NON_EXISTENT_UUID)
			).resolves.not.toThrow();
		});
	});
});

/**
 * Feature Gating Tests
 *
 * Tests that route sharing is gated behind the fleet_management feature.
 * - Pro plan users can create shares
 * - Free plan users get 403 forbidden
 * - Free plan users can still view/revoke existing shares
 */
describe('RouteShareService - Feature Gating', () => {
	// Separate test fixtures for feature gating tests
	let billingOrg: { id: string };
	let billingUser: { id: string };
	let freePlan: { id: string };
	let proPlan: { id: string };
	let billingSubscription: { id: string };
	let billingMap: { id: string };
	let billingDriver: { id: string };
	let billingDepot: { id: string };
	let billingLocation: { id: string };
	let billingRoute: { id: string };

	// Track created IDs for cleanup
	const featureTestShareIds: string[] = [];
	const featureTestRouteIds: string[] = [];
	const featureTestDepotIds: string[] = [];
	const featureTestMapIds: string[] = [];
	const featureTestLocationIds: string[] = [];
	const featureTestDriverIds: string[] = [];
	const featureTestSubscriptionIds: string[] = [];
	const featureTestUserIds: string[] = [];
	const featureTestOrgIds: string[] = [];

	beforeAll(async () => {
		const tx = db as unknown as TestTransaction;

		// Create billing test environment (org with free plan subscription)
		const billingEnv = await createBillingTestEnvironment(tx);
		billingOrg = billingEnv.organization;
		billingUser = billingEnv.user;
		freePlan = billingEnv.freePlan;
		proPlan = billingEnv.proPlan;
		billingSubscription = billingEnv.subscription;

		featureTestOrgIds.push(billingOrg.id);
		featureTestUserIds.push(billingUser.id);
		featureTestSubscriptionIds.push(billingSubscription.id);

		// Create route setup for this org
		billingLocation = await createLocation(tx, {
			organization_id: billingOrg.id
		});
		featureTestLocationIds.push(billingLocation.id);

		billingMap = await createMap(tx, { organization_id: billingOrg.id });
		featureTestMapIds.push(billingMap.id);

		billingDriver = await createDriver(tx, {
			organization_id: billingOrg.id,
			active: true
		});
		featureTestDriverIds.push(billingDriver.id);

		billingDepot = await createDepot(tx, {
			organization_id: billingOrg.id,
			location_id: billingLocation.id,
			default_depot: true
		});
		featureTestDepotIds.push(billingDepot.id);

		billingRoute = await createRoute(tx, {
			organization_id: billingOrg.id,
			map_id: billingMap.id,
			driver_id: billingDriver.id,
			depot_id: billingDepot.id
		});
		featureTestRouteIds.push(billingRoute.id);
	});

	afterAll(async () => {
		// Clean up in correct FK order
		if (featureTestShareIds.length > 0) {
			await db
				.delete(routeShares)
				.where(inArray(routeShares.id, featureTestShareIds));
		}
		if (featureTestRouteIds.length > 0) {
			await db.delete(routes).where(inArray(routes.id, featureTestRouteIds));
		}
		if (featureTestDepotIds.length > 0) {
			await db.delete(depots).where(inArray(depots.id, featureTestDepotIds));
		}
		if (featureTestMapIds.length > 0) {
			await db.delete(maps).where(inArray(maps.id, featureTestMapIds));
		}
		if (featureTestLocationIds.length > 0) {
			await db
				.delete(locations)
				.where(inArray(locations.id, featureTestLocationIds));
		}
		if (featureTestDriverIds.length > 0) {
			await db.delete(drivers).where(inArray(drivers.id, featureTestDriverIds));
		}
		if (featureTestSubscriptionIds.length > 0) {
			await db
				.delete(subscriptions)
				.where(inArray(subscriptions.id, featureTestSubscriptionIds));
		}
		if (featureTestUserIds.length > 0) {
			await db.delete(users).where(inArray(users.id, featureTestUserIds));
		}
		if (featureTestOrgIds.length > 0) {
			await db
				.delete(organizations)
				.where(inArray(organizations.id, featureTestOrgIds));
		}
		// Note: Do NOT delete plans - they are shared across tests
	});

	describe('createEmailShare()', () => {
		it('blocks share creation for Free plan users', async () => {
			// Subscription is on Free plan by default from createBillingTestEnvironment
			await expect(
				routeShareService.createEmailShare(
					billingRoute.id,
					'test@example.com',
					billingOrg.id,
					billingUser.id
				)
			).rejects.toThrow(ServiceError);

			try {
				await routeShareService.createEmailShare(
					billingRoute.id,
					'test@example.com',
					billingOrg.id,
					billingUser.id
				);
			} catch (err) {
				expect(err).toBeInstanceOf(ServiceError);
				expect((err as ServiceError).code).toBe('FORBIDDEN');
				expect((err as ServiceError).message).toContain('Pro subscription');
			}
		});

		it('allows share creation for Pro plan users', async () => {
			// Upgrade to Pro plan
			await db
				.update(subscriptions)
				.set({ plan_id: proPlan.id })
				.where(eq(subscriptions.id, billingSubscription.id));

			const result = await routeShareService.createEmailShare(
				billingRoute.id,
				'pro-test@example.com',
				billingOrg.id,
				billingUser.id
			);

			expect(result.share).toBeDefined();
			expect(result.token).toBeDefined();
			featureTestShareIds.push(result.share.id);

			// Downgrade back to Free for other tests
			await db
				.update(subscriptions)
				.set({ plan_id: freePlan.id })
				.where(eq(subscriptions.id, billingSubscription.id));
		});
	});

	describe('getSharesForRoute()', () => {
		it('allows viewing shares regardless of plan', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a share directly in DB (bypassing feature gate)
			const share = await createRouteShare(tx, {
				organization_id: billingOrg.id,
				route_id: billingRoute.id,
				created_by: billingUser.id
			});
			featureTestShareIds.push(share.id);

			// Should be able to view shares even on Free plan
			const shares = await routeShareService.getSharesForRoute(
				billingRoute.id,
				billingOrg.id
			);

			expect(shares.length).toBeGreaterThan(0);
			expect(shares.some((s) => s.id === share.id)).toBe(true);
		});
	});

	describe('revokeShare()', () => {
		it('allows revoking shares regardless of plan', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a share directly in DB (bypassing feature gate)
			const share = await createRouteShare(tx, {
				organization_id: billingOrg.id,
				route_id: billingRoute.id,
				created_by: billingUser.id
			});
			featureTestShareIds.push(share.id);

			// Should be able to revoke shares even on Free plan
			await expect(
				routeShareService.revokeShare(share.id, billingOrg.id)
			).resolves.not.toThrow();

			// Verify it was revoked
			const [revokedShare] = await db
				.select()
				.from(routeShares)
				.where(eq(routeShares.id, share.id));
			expect(revokedShare.revoked_at).not.toBeNull();
		});
	});
});
