/**
 * Route Share Flow Integration Tests
 *
 * Verifies the complete route sharing workflow including token generation,
 * validation, email sending, and access control.
 * Uses withTestTransaction for automatic rollback - no manual cleanup needed.
 */
import { db } from '$lib/server/db';
import { mailRecords, organizations, routeShares } from '$lib/server/db/schema';
import {
	createBillingTestEnvironment,
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createRoute,
	createRouteShare,
	createStop,
	withTestTransaction
} from '$lib/testing';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routeShareService } from './route-share.service';
import { TokenUtils } from './token.utils';

// Mock mail service - uses DB-aware implementation for integration tests
// that verify the full create → send → link flow.
// Shape matches createMockMailService() from $lib/testing/mocks.
const mockMailService = vi.hoisted(() => ({
	sendRouteShareEmail: vi.fn(),
	sendLoginEmail: vi.fn(),
	sendInvitationEmail: vi.fn(),
	sendPasswordResetEmail: vi.fn()
}));

vi.mock('$lib/services/server/mail.service', () => ({
	mailService: mockMailService
}));

beforeEach(() => {
	vi.clearAllMocks();

	// DB-aware implementation: simulates the real mail service creating
	// a mail record and linking it to the share
	mockMailService.sendRouteShareEmail.mockImplementation(async (share) => {
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

		await db
			.update(routeShares)
			.set({ mail_record_id: mailRecord.id, updated_at: new Date() })
			.where(eq(routeShares.id, share.id));
	});
});

/** Helper to create full test environment with Pro plan for fleet_management feature */
async function createProTestEnvironment() {
	const billingEnv = await createBillingTestEnvironment();
	const { organization, user } = billingEnv;

	// Upgrade to Pro plan for fleet_management feature
	await db
		.update(organizations)
		.set({ subscription_status: 'active' })
		.where(eq(organizations.id, organization.id));

	const location = await createLocation({ organization_id: organization.id });
	const depot = await createDepot({
		organization_id: organization.id,
		location_id: location.id
	});
	const map = await createMap({
		organization_id: organization.id,
		title: 'Test Map'
	});
	const driver = await createDriver({
		organization_id: organization.id,
		name: 'Test Driver'
	});
	const stop = await createStop({
		organization_id: organization.id,
		map_id: map.id,
		location_id: location.id
	});
	const route = await createRoute({
		organization_id: organization.id,
		map_id: map.id,
		driver_id: driver.id,
		depot_id: depot.id
	});

	return { organization, user, location, depot, map, driver, stop, route };
}

describe('Route Share Flow Tests', () => {
	// ============================================================================
	// Token Generation and Storage
	// ============================================================================
	describe('Token Generation and Storage', () => {
		it('createEmailShare returns raw token and stores hash', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { share, token } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

				// Token should be returned
				expect(token).toBeDefined();
				expect(typeof token).toBe('string');

				// Share should have a hash stored (not the raw token)
				expect(share.access_token_hash).toBeDefined();
				expect(share.access_token_hash).not.toBe(token);
			});
		});

		it('stored hash is SHA-256 of raw token', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { share, token } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

				// Compute the expected hash
				const expectedHash = TokenUtils.hash(token);
				expect(share.access_token_hash).toBe(expectedHash);
			});
		});

		it('token is 64 hex characters (32 bytes)', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { token } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

				// 32 bytes = 64 hex characters
				expect(token.length).toBe(64);
				expect(/^[0-9a-f]+$/.test(token)).toBe(true);
			});
		});

		it('each share gets a unique token', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { token: token1 } = await routeShareService.createEmailShare(
					route.id,
					'recipient1@example.com',
					organization.id,
					user.id
				);
				const { token: token2 } = await routeShareService.createEmailShare(
					route.id,
					'recipient2@example.com',
					organization.id,
					user.id
				);

				expect(token1).not.toBe(token2);
			});
		});
	});

	// ============================================================================
	// Token Validation
	// ============================================================================
	describe('Token Validation', () => {
		it('valid token returns route with full details', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { token } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

				const result = await routeShareService.validateTokenAndGetRoute(token);

				expect(result).not.toBeNull();
				expect(result?.route.id).toBe(route.id);
				expect(result?.driver).toBeDefined();
				expect(result?.depot).toBeDefined();
				expect(result?.map).toBeDefined();
			});
		});

		it('expired token returns null', async () => {
			await withTestTransaction(async () => {
				const { organization, route } = await createProTestEnvironment();

				// Create a share with past expiration
				const token = TokenUtils.generateHex();
				const tokenHash = TokenUtils.hash(token);

				await createRouteShare({
					organization_id: organization.id,
					route_id: route.id,
					access_token_hash: tokenHash,
					expires_at: new Date(Date.now() - 1000) // 1 second ago
				});

				const result = await routeShareService.validateTokenAndGetRoute(token);
				expect(result).toBeNull();
			});
		});

		it('revoked token returns null', async () => {
			await withTestTransaction(async () => {
				const { organization, route } = await createProTestEnvironment();

				// Create a revoked share
				const token = TokenUtils.generateHex();
				const tokenHash = TokenUtils.hash(token);

				await createRouteShare({
					organization_id: organization.id,
					route_id: route.id,
					access_token_hash: tokenHash,
					revoked_at: new Date()
				});

				const result = await routeShareService.validateTokenAndGetRoute(token);
				expect(result).toBeNull();
			});
		});

		it('invalid/non-existent token returns null', async () => {
			await withTestTransaction(async () => {
				const result = await routeShareService.validateTokenAndGetRoute(
					'nonexistent_token_12345678901234567890123456789012'
				);
				expect(result).toBeNull();
			});
		});
	});

	// ============================================================================
	// Share Lifecycle
	// ============================================================================
	describe('Share Lifecycle', () => {
		it('new share has no revoked_at', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { share } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

				expect(share.revoked_at).toBeNull();
			});
		});

		it('revoked share has revoked_at set', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { share } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

				await routeShareService.revokeShare(share.id, organization.id);

				const revokedShare = await routeShareService.getShareById(
					share.id,
					organization.id
				);
				expect(revokedShare.revoked_at).not.toBeNull();
			});
		});

		it('cannot revoke already revoked share - throws BAD_REQUEST', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const { share } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

				// First revoke succeeds
				await routeShareService.revokeShare(share.id, organization.id);

				// Second revoke should throw
				await expect(
					routeShareService.revokeShare(share.id, organization.id)
				).rejects.toMatchObject({
					code: 'BAD_REQUEST',
					message: expect.stringContaining('already revoked')
				});
			});
		});
	});

	// ============================================================================
	// Email Share Workflow
	// ============================================================================
	describe('Email Share Workflow', () => {
		it('createAndSendEmailShare creates share with mail record', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const result = await routeShareService.createAndSendEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id,
					'https://example.com'
				);

				expect(result).toBeDefined();
				expect(result.route_id).toBe(route.id);
				expect(result.mail_record_id).toBeDefined();
			});
		});

		it('share links to mail record via mail_record_id', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				const result = await routeShareService.createAndSendEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id,
					'https://example.com'
				);

				// Verify the share is linked to a mail record
				const shares = await routeShareService.getSharesForRoute(
					route.id,
					organization.id
				);
				const shareWithRecord = shares.find((s) => s.id === result.id);

				expect(shareWithRecord?.mailRecord).toBeDefined();
				expect(shareWithRecord?.mailRecord?.type).toBe('route_share');
			});
		});
	});

	// ============================================================================
	// Resend Flow
	// ============================================================================
	describe('Resend Flow', () => {
		it('resend revokes old share and creates new share with new token', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				// Create initial share
				const initialShare = await routeShareService.createAndSendEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id,
					'https://example.com'
				);

				// Resend the share
				const newShare = await routeShareService.resendEmailShare(
					initialShare.id,
					organization.id,
					user.id,
					'https://example.com'
				);

				// Old share should be revoked
				const oldShare = await routeShareService.getShareById(
					initialShare.id,
					organization.id
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
		});

		it('old token invalid after resend', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				// Create initial share and get the token
				const { share: initialShare, token: oldToken } =
					await routeShareService.createEmailShare(
						route.id,
						'recipient@example.com',
						organization.id,
						user.id
					);

				// Set up mail record for resend
				const [mailRecord] = await db
					.insert(mailRecords)
					.values({
						organization_id: organization.id,
						type: 'route_share',
						to_email: 'recipient@example.com',
						from_email: 'noreply@test.com',
						subject: 'Route shared',
						resend_id: `mock-resend-${Date.now()}`
					})
					.returning();

				await db
					.update(routeShares)
					.set({ mail_record_id: mailRecord.id })
					.where(eq(routeShares.id, initialShare.id));

				// Verify old token works before resend
				const beforeResend =
					await routeShareService.validateTokenAndGetRoute(oldToken);
				expect(beforeResend).not.toBeNull();

				// Resend the share
				await routeShareService.resendEmailShare(
					initialShare.id,
					organization.id,
					user.id,
					'https://example.com'
				);

				// Old token should no longer work
				const afterResend =
					await routeShareService.validateTokenAndGetRoute(oldToken);
				expect(afterResend).toBeNull();
			});
		});

		it('resend fails if no email on original share - throws BAD_REQUEST', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route } = await createProTestEnvironment();

				// Create share without mail record (direct DB insert)
				const share = await createRouteShare({
					organization_id: organization.id,
					route_id: route.id
				});

				await expect(
					routeShareService.resendEmailShare(
						share.id,
						organization.id,
						user.id,
						'https://example.com'
					)
				).rejects.toMatchObject({
					code: 'BAD_REQUEST',
					message: expect.stringContaining('no email address')
				});
			});
		});
	});

	// ============================================================================
	// Public Access via Token
	// ============================================================================
	describe('Public Access via Token', () => {
		it('validateTokenAndGetRoute returns complete RouteWithDetails', async () => {
			await withTestTransaction(async () => {
				const { organization, user, route, driver, depot, map } =
					await createProTestEnvironment();

				const { token } = await routeShareService.createEmailShare(
					route.id,
					'recipient@example.com',
					organization.id,
					user.id
				);

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
});
