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
	users
} from '$lib/server/db/schema';
import {
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
