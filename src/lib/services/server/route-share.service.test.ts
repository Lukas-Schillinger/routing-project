import { db } from '$lib/server/db';
import { mailRecords, routeShares, subscriptions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { routeShareService } from './route-share.service';
import {
	createBillingTestEnvironment,
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createRoute,
	createRouteShare,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';

/**
 * Route Share Service Tests
 *
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */

describe('RouteShareService', () => {
	describe('setMailRecordId()', () => {
		it('updates mail_record_id on existing share', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createTestEnvironment();
				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id,
					default_depot: true
				});
				const route = await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});

				const share = await createRouteShare({
					organization_id: organization.id,
					route_id: route.id,
					created_by: user.id
				});

				const [mailRecord] = await db
					.insert(mailRecords)
					.values({
						organization_id: organization.id,
						resend_id: `test-resend-id-${Date.now()}`,
						type: 'route_share',
						to_email: 'test@example.com',
						from_email: 'noreply@example.com',
						status: 'delivered'
					})
					.returning();

				await routeShareService.setMailRecordId(share.id, mailRecord.id);

				const [updatedShare] = await db
					.select()
					.from(routeShares)
					.where(eq(routeShares.id, share.id))
					.limit(1);

				expect(updatedShare.mail_record_id).toBe(mailRecord.id);
			});
		});

		it('does not throw for non-existent shareId', async () => {
			await withTestTransaction(async () => {
				const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

				await expect(
					routeShareService.setMailRecordId(
						NON_EXISTENT_UUID,
						NON_EXISTENT_UUID
					)
				).resolves.not.toThrow();
			});
		});
	});
});

/**
 * Feature Gating Tests
 *
 * Tests that route sharing is gated behind the fleet_management feature.
 */
describe('RouteShareService - Feature Gating', () => {
	describe('createEmailShare()', () => {
		it('blocks share creation for Free plan users', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createBillingTestEnvironment();

				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id,
					default_depot: true
				});
				const route = await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});

				await expect(
					routeShareService.createEmailShare(
						route.id,
						'test@example.com',
						organization.id,
						user.id
					)
				).rejects.toMatchObject({
					code: 'FORBIDDEN',
					message: expect.stringContaining('Pro subscription')
				});
			});
		});

		it('allows share creation for Pro plan users', async () => {
			await withTestTransaction(async () => {
				const { organization, user, subscription, proPlan } =
					await createBillingTestEnvironment();

				// Upgrade to Pro plan
				await db
					.update(subscriptions)
					.set({ plan_id: proPlan.id })
					.where(eq(subscriptions.id, subscription.id));

				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id,
					default_depot: true
				});
				const route = await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});

				const result = await routeShareService.createEmailShare(
					route.id,
					'pro-test@example.com',
					organization.id,
					user.id
				);

				expect(result.share).toBeDefined();
				expect(result.token).toBeDefined();
			});
		});
	});

	describe('getSharesForRoute()', () => {
		it('allows viewing shares regardless of plan', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createBillingTestEnvironment();

				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id,
					default_depot: true
				});
				const route = await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});

				const share = await createRouteShare({
					organization_id: organization.id,
					route_id: route.id,
					created_by: user.id
				});

				const shares = await routeShareService.getSharesForRoute(
					route.id,
					organization.id
				);

				expect(shares.length).toBeGreaterThan(0);
				expect(shares.some((s) => s.id === share.id)).toBe(true);
			});
		});
	});

	describe('revokeShare()', () => {
		it('allows revoking shares regardless of plan', async () => {
			await withTestTransaction(async () => {
				const { organization, user } = await createBillingTestEnvironment();

				const location = await createLocation({
					organization_id: organization.id
				});
				const map = await createMap({ organization_id: organization.id });
				const driver = await createDriver({
					organization_id: organization.id,
					active: true
				});
				const depot = await createDepot({
					organization_id: organization.id,
					location_id: location.id,
					default_depot: true
				});
				const route = await createRoute({
					organization_id: organization.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});

				const share = await createRouteShare({
					organization_id: organization.id,
					route_id: route.id,
					created_by: user.id
				});

				await expect(
					routeShareService.revokeShare(share.id, organization.id)
				).resolves.not.toThrow();

				const [revokedShare] = await db
					.select()
					.from(routeShares)
					.where(eq(routeShares.id, share.id));
				expect(revokedShare.revoked_at).not.toBeNull();
			});
		});
	});
});
