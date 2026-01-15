/**
 * Route Share Flow Integration Tests
 *
 * Verifies the complete route sharing workflow including token generation,
 * validation, email sending, and access control.
 */
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
	stops,
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
	createStop,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { eq, inArray } from 'drizzle-orm';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { ServiceError } from './errors';
import { routeShareService } from './route-share.service';
import { TokenUtils } from './token.utils';

// Mock the mail service to avoid actual email sending
vi.mock('$lib/services/external/mail', () => ({
	mailService: {
		sendRouteShareEmail: vi.fn().mockImplementation(async (share) => {
			// Simulate creating a mail record
			const [mailRecord] = await db
				.insert(mailRecords)
				.values({
					organization_id: share.organization_id,
					type: 'route_share',
					to_email: 'test@example.com',
					from_email: 'noreply@test.com',
					subject: 'Route shared',
					resend_id: `mock-resend-${Date.now()}`
				})
				.returning();

			// Link the mail record to the share
			await db
				.update(routeShares)
				.set({ mail_record_id: mailRecord.id, updated_at: new Date() })
				.where(eq(routeShares.id, share.id));
		})
	}
}));

/**
 * Test fixtures
 */
let org: { id: string };
let user: { id: string };
let location: { id: string };
let depot: { id: string };
let map: { id: string };
let driver: { id: string };
let stop: { id: string };
let route: { id: string };

// Track IDs for cleanup
const orgIds: string[] = [];
const userIds: string[] = [];
const locationIds: string[] = [];
const depotIds: string[] = [];
const mapIds: string[] = [];
const driverIds: string[] = [];
const stopIds: string[] = [];
const routeIds: string[] = [];
const shareIds: string[] = [];
const mailRecordIds: string[] = [];

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create organization and user
	org = await createOrganization(tx, { name: 'Route Share Test Org' });
	orgIds.push(org.id);

	user = await createUser(tx, { organization_id: org.id, role: 'admin' });
	userIds.push(user.id);

	// Create location
	location = await createLocation(tx, { organization_id: org.id });
	locationIds.push(location.id);

	// Create depot
	depot = await createDepot(tx, {
		organization_id: org.id,
		location_id: location.id
	});
	depotIds.push(depot.id);

	// Create map
	map = await createMap(tx, { organization_id: org.id, title: 'Test Map' });
	mapIds.push(map.id);

	// Create driver
	driver = await createDriver(tx, {
		organization_id: org.id,
		name: 'Test Driver'
	});
	driverIds.push(driver.id);

	// Create stop
	stop = await createStop(tx, {
		organization_id: org.id,
		map_id: map.id,
		location_id: location.id
	});
	stopIds.push(stop.id);

	// Create route
	route = await createRoute(tx, {
		organization_id: org.id,
		map_id: map.id,
		driver_id: driver.id,
		depot_id: depot.id
	});
	routeIds.push(route.id);
});

beforeEach(() => {
	vi.clearAllMocks();
});

afterAll(async () => {
	// Cleanup in reverse FK order
	if (mailRecordIds.length > 0) {
		await db.delete(mailRecords).where(inArray(mailRecords.id, mailRecordIds));
	}
	if (shareIds.length > 0) {
		await db.delete(routeShares).where(inArray(routeShares.id, shareIds));
	}
	if (routeIds.length > 0) {
		await db.delete(routes).where(inArray(routes.id, routeIds));
	}
	if (stopIds.length > 0) {
		await db.delete(stops).where(inArray(stops.id, stopIds));
	}
	if (depotIds.length > 0) {
		await db.delete(depots).where(inArray(depots.id, depotIds));
	}
	if (mapIds.length > 0) {
		await db.delete(maps).where(inArray(maps.id, mapIds));
	}
	if (driverIds.length > 0) {
		await db.delete(drivers).where(inArray(drivers.id, driverIds));
	}
	if (locationIds.length > 0) {
		await db.delete(locations).where(inArray(locations.id, locationIds));
	}
	if (userIds.length > 0) {
		await db.delete(users).where(inArray(users.id, userIds));
	}
	if (orgIds.length > 0) {
		await db.delete(organizations).where(inArray(organizations.id, orgIds));
	}
});

describe('Route Share Flow Tests', () => {
	// ============================================================================
	// Token Generation and Storage
	// ============================================================================
	describe('Token Generation and Storage', () => {
		it('createEmailShare returns raw token and stores hash', async () => {
			const { share, token } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			shareIds.push(share.id);

			// Token should be returned
			expect(token).toBeDefined();
			expect(typeof token).toBe('string');

			// Share should have a hash stored (not the raw token)
			expect(share.access_token_hash).toBeDefined();
			expect(share.access_token_hash).not.toBe(token);
		});

		it('stored hash is SHA-256 of raw token', async () => {
			const { share, token } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			shareIds.push(share.id);

			// Compute the expected hash
			const expectedHash = TokenUtils.hash(token);
			expect(share.access_token_hash).toBe(expectedHash);
		});

		it('token is 64 hex characters (32 bytes)', async () => {
			const { token } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			shareIds.push(
				(await routeShareService.getSharesForRoute(route.id, org.id))[0].id
			);

			// 32 bytes = 64 hex characters
			expect(token.length).toBe(64);
			expect(/^[0-9a-f]+$/.test(token)).toBe(true);
		});

		it('each share gets a unique token', async () => {
			const { token: token1 } = await routeShareService.createEmailShare(
				route.id,
				'recipient1@example.com',
				org.id,
				user.id
			);
			const { token: token2 } = await routeShareService.createEmailShare(
				route.id,
				'recipient2@example.com',
				org.id,
				user.id
			);

			const shares = await routeShareService.getSharesForRoute(
				route.id,
				org.id
			);
			shareIds.push(...shares.map((s) => s.id));

			expect(token1).not.toBe(token2);
		});
	});

	// ============================================================================
	// Token Validation
	// ============================================================================
	describe('Token Validation', () => {
		it('valid token returns route with full details', async () => {
			const { token } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			const shares = await routeShareService.getSharesForRoute(
				route.id,
				org.id
			);
			shareIds.push(...shares.map((s) => s.id));

			const result = await routeShareService.validateTokenAndGetRoute(token);

			expect(result).not.toBeNull();
			expect(result?.route.id).toBe(route.id);
			expect(result?.driver).toBeDefined();
			expect(result?.depot).toBeDefined();
			expect(result?.map).toBeDefined();
		});

		it('expired token returns null', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a share with past expiration
			const token = TokenUtils.generateHex();
			const tokenHash = TokenUtils.hash(token);

			const share = await createRouteShare(tx, {
				organization_id: org.id,
				route_id: route.id,
				access_token_hash: tokenHash,
				expires_at: new Date(Date.now() - 1000) // 1 second ago
			});
			shareIds.push(share.id);

			const result = await routeShareService.validateTokenAndGetRoute(token);
			expect(result).toBeNull();
		});

		it('revoked token returns null', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a revoked share
			const token = TokenUtils.generateHex();
			const tokenHash = TokenUtils.hash(token);

			const share = await createRouteShare(tx, {
				organization_id: org.id,
				route_id: route.id,
				access_token_hash: tokenHash,
				revoked_at: new Date()
			});
			shareIds.push(share.id);

			const result = await routeShareService.validateTokenAndGetRoute(token);
			expect(result).toBeNull();
		});

		it('invalid/non-existent token returns null', async () => {
			const result = await routeShareService.validateTokenAndGetRoute(
				'nonexistent_token_12345678901234567890123456789012'
			);
			expect(result).toBeNull();
		});
	});

	// ============================================================================
	// Share Lifecycle
	// ============================================================================
	describe('Share Lifecycle', () => {
		it('new share has no revoked_at', async () => {
			const { share } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			shareIds.push(share.id);

			expect(share.revoked_at).toBeNull();
		});

		it('revoked share has revoked_at set', async () => {
			const { share } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			shareIds.push(share.id);

			await routeShareService.revokeShare(share.id, org.id);

			const revokedShare = await routeShareService.getShare(share.id, org.id);
			expect(revokedShare.revoked_at).not.toBeNull();
		});

		it('cannot revoke already revoked share - throws BAD_REQUEST', async () => {
			const { share } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			shareIds.push(share.id);

			// First revoke succeeds
			await routeShareService.revokeShare(share.id, org.id);

			// Second revoke should throw
			try {
				await routeShareService.revokeShare(share.id, org.id);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('BAD_REQUEST');
				expect((error as ServiceError).message).toContain('already revoked');
			}
		});
	});

	// ============================================================================
	// Email Share Workflow
	// ============================================================================
	describe('Email Share Workflow', () => {
		it('createAndSendEmailShare creates share with mail record', async () => {
			const result = await routeShareService.createAndSendEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id,
				'https://example.com'
			);
			shareIds.push(result.id);
			if (result.mail_record_id) {
				mailRecordIds.push(result.mail_record_id);
			}

			expect(result).toBeDefined();
			expect(result.route_id).toBe(route.id);
			expect(result.mail_record_id).toBeDefined();
		});

		it('share links to mail record via mail_record_id', async () => {
			const result = await routeShareService.createAndSendEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id,
				'https://example.com'
			);
			shareIds.push(result.id);
			if (result.mail_record_id) {
				mailRecordIds.push(result.mail_record_id);
			}

			// Verify the share is linked to a mail record
			const shares = await routeShareService.getSharesForRoute(
				route.id,
				org.id
			);
			const shareWithRecord = shares.find((s) => s.id === result.id);

			expect(shareWithRecord?.mailRecord).toBeDefined();
			expect(shareWithRecord?.mailRecord?.type).toBe('route_share');
		});
	});

	// ============================================================================
	// Resend Flow
	// ============================================================================
	describe('Resend Flow', () => {
		it('resend revokes old share and creates new share with new token', async () => {
			// Create initial share
			const initialShare = await routeShareService.createAndSendEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id,
				'https://example.com'
			);
			shareIds.push(initialShare.id);
			if (initialShare.mail_record_id) {
				mailRecordIds.push(initialShare.mail_record_id);
			}

			// Resend the share
			const newShare = await routeShareService.resendEmailShare(
				initialShare.id,
				org.id,
				user.id,
				'https://example.com'
			);
			shareIds.push(newShare.id);
			if (newShare.mail_record_id) {
				mailRecordIds.push(newShare.mail_record_id);
			}

			// Old share should be revoked
			const oldShare = await routeShareService.getShare(
				initialShare.id,
				org.id
			);
			expect(oldShare.revoked_at).not.toBeNull();

			// New share should be active
			expect(newShare.id).not.toBe(initialShare.id);
			expect(newShare.revoked_at).toBeNull();

			// Tokens should be different
			expect(newShare.access_token_hash).not.toBe(
				initialShare.access_token_hash
			);
		});

		it('old token invalid after resend', async () => {
			// Create initial share and get the token
			const { share: initialShare, token: oldToken } =
				await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					org.id,
					user.id
				);
			shareIds.push(initialShare.id);

			// Set up mail record for resend
			const [mailRecord] = await db
				.insert(mailRecords)
				.values({
					organization_id: org.id,
					type: 'route_share',
					to_email: 'recipient@example.com',
					from_email: 'noreply@test.com',
					subject: 'Route shared',
					resend_id: `mock-resend-${Date.now()}`
				})
				.returning();
			mailRecordIds.push(mailRecord.id);

			await db
				.update(routeShares)
				.set({ mail_record_id: mailRecord.id })
				.where(eq(routeShares.id, initialShare.id));

			// Verify old token works before resend
			const beforeResend =
				await routeShareService.validateTokenAndGetRoute(oldToken);
			expect(beforeResend).not.toBeNull();

			// Resend the share
			const newShare = await routeShareService.resendEmailShare(
				initialShare.id,
				org.id,
				user.id,
				'https://example.com'
			);
			shareIds.push(newShare.id);
			if (newShare.mail_record_id) {
				mailRecordIds.push(newShare.mail_record_id);
			}

			// Old token should no longer work
			const afterResend =
				await routeShareService.validateTokenAndGetRoute(oldToken);
			expect(afterResend).toBeNull();
		});

		it('resend fails if no email on original share - throws BAD_REQUEST', async () => {
			const tx = db as unknown as TestTransaction;

			// Create share without mail record (direct DB insert)
			const share = await createRouteShare(tx, {
				organization_id: org.id,
				route_id: route.id
			});
			shareIds.push(share.id);

			try {
				await routeShareService.resendEmailShare(
					share.id,
					org.id,
					user.id,
					'https://example.com'
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('BAD_REQUEST');
				expect((error as ServiceError).message).toContain('no email address');
			}
		});
	});

	// ============================================================================
	// Public Access via Token
	// ============================================================================
	describe('Public Access via Token', () => {
		it('validateTokenAndGetRoute returns complete RouteWithDetails', async () => {
			const { token } = await routeShareService.createEmailShare(
				route.id,
				'recipient@example.com',
				org.id,
				user.id
			);
			const shares = await routeShareService.getSharesForRoute(
				route.id,
				org.id
			);
			shareIds.push(...shares.map((s) => s.id));

			const result = await routeShareService.validateTokenAndGetRoute(token);

			expect(result).not.toBeNull();
			expect(result?.route).toBeDefined();
			expect(result?.route.id).toBe(route.id);

			// Should include driver details
			expect(result?.driver).toBeDefined();
			expect(result?.driver.id).toBe(driver.id);
			expect(result?.driver.name).toBe('Test Driver');

			// Should include depot details (DepotWithLocationJoin has depot.depot)
			expect(result?.depot).toBeDefined();
			expect(result?.depot.depot.id).toBe(depot.id);

			// Should include map details
			expect(result?.map).toBeDefined();
			expect(result?.map.id).toBe(map.id);
			expect(result?.map.title).toBe('Test Map');
		});
	});
});
