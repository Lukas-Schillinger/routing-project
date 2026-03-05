/**
 * Mock Factories (browser-safe)
 *
 * Pure data generators with no server/DB dependencies.
 * Safe to import in Storybook, browser tests, and server tests alike.
 *
 * - `createMock<Model>(overrides?)` — returns $inferInsert object (for DB insertion)
 * - `createMock<Model>Row(overrides?)` — returns full Zod schema object (for components/stories)
 */
import type * as schema from '$lib/server/db/schema';
import type {
	Organization,
	PublicUser,
	Invitation,
	MailRecord,
	Driver,
	Stop,
	Route,
	Map,
	Depot,
	Permission
} from '$lib/schemas';
import type { Location } from '$lib/schemas/location';
import { generateRandomColor } from '$lib/utils';
import locationsData from '../data/locations.json';

// ============================================================================
// Helpers
// ============================================================================

let counter = 0;
let locationIndex = 0;
const runId = Math.random().toString(36).substring(2, 8);

function uniqueId(): string {
	return `${runId}-${++counter}`;
}

// ============================================================================
// Organization
// ============================================================================

export type MockOrganization = typeof schema.organizations.$inferInsert;

export function createMockOrganization(
	overrides?: Partial<MockOrganization>
): MockOrganization {
	return {
		name: `Test Organization ${uniqueId()}`,
		...overrides
	};
}

export function createMockOrganizationRow(
	overrides?: Partial<Organization>
): Organization {
	return {
		id: crypto.randomUUID(),
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		stripe_customer_id: null,
		stripe_subscription_id: null,
		subscription_status: null,
		billing_period_starts_at: null,
		billing_period_ends_at: null,
		cancel_at_period_end: false,
		...createMockOrganization(),
		...overrides
	};
}

// ============================================================================
// User
// ============================================================================

export type MockUser = typeof schema.users.$inferInsert;

export function createMockUser(overrides?: Partial<MockUser>): MockUser {
	const id = uniqueId();
	return {
		organization_id: '', // Must be provided
		email: `test-user-${id}@example.com`,
		name: `Test User ${id}`,
		role: 'member',
		...overrides
	};
}

export function createMockPublicUserRow(
	overrides?: Partial<PublicUser>
): PublicUser {
	const id = uniqueId();
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		name: `Test User ${id}`,
		email: `test-user-${id}@example.com`,
		role: 'member',
		email_confirmed_at: null,
		...overrides
	};
}

// ============================================================================
// Driver
// ============================================================================

export type MockDriver = typeof schema.drivers.$inferInsert;

export function createMockDriver(overrides?: Partial<MockDriver>): MockDriver {
	const id = uniqueId();
	return {
		organization_id: '', // Must be provided
		name: `Driver ${id}`,
		phone: `555-${String(counter).padStart(4, '0')}`,
		color: generateRandomColor(),
		active: true,
		temporary: false,
		...overrides
	};
}

export function createMockDriverRow(overrides?: Partial<Driver>): Driver {
	const id = uniqueId();
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		name: `Driver ${id}`,
		phone: `555-${String(counter).padStart(4, '0')}`,
		notes: null,
		active: true,
		temporary: false,
		color: generateRandomColor(),
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		...overrides
	};
}

// ============================================================================
// Location (uses real pre-geocoded data from Lakeland, FL)
// ============================================================================

export type MockLocation = typeof schema.locations.$inferInsert;

export function createMockLocation(
	overrides?: Partial<MockLocation>
): MockLocation {
	const entry = locationsData[locationIndex++ % locationsData.length];

	return {
		organization_id: '', // Must be provided
		address_line_1: entry.address_line_1,
		address_line_2: entry.address_line_2,
		address_number: entry.address_number,
		street_name: entry.street_name,
		city: entry.city,
		region: entry.region,
		postal_code: entry.postal_code,
		country: entry.country,
		lat: entry.lat,
		lon: entry.lon,
		geocode_raw: entry.geocode_raw,
		geocode_confidence:
			(entry.geocode_confidence as 'exact' | 'high' | 'medium' | 'low') ??
			'high',
		geocode_provider: entry.geocode_provider ?? 'mapbox',
		...overrides
	};
}

export function createMockLocationRow(overrides?: Partial<Location>): Location {
	const entry = locationsData[locationIndex++ % locationsData.length];
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		address_line_1: entry.address_line_1,
		address_line_2: entry.address_line_2,
		address_number: entry.address_number,
		street_name: entry.street_name,
		city: entry.city,
		region: entry.region,
		postal_code: entry.postal_code,
		country: entry.country,
		lat: entry.lat,
		lon: entry.lon,
		geocode_raw: entry.geocode_raw,
		geocode_confidence:
			(entry.geocode_confidence as 'exact' | 'high' | 'medium' | 'low') ??
			'high',
		geocode_provider: entry.geocode_provider ?? 'mapbox',
		geocode_place_id: null,
		address_hash: null,
		...overrides
	};
}

// ============================================================================
// Map
// ============================================================================

export type MockMap = typeof schema.maps.$inferInsert;

export function createMockMap(overrides?: Partial<MockMap>): MockMap {
	return {
		organization_id: '', // Must be provided
		title: `Test Map ${uniqueId()}`,
		depot_id: null,
		...overrides
	};
}

export function createMockMapRow(overrides?: Partial<Map>): Map {
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		title: `Test Map ${uniqueId()}`,
		depot_id: null,
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		...overrides
	};
}

// ============================================================================
// Stop
// ============================================================================

export type MockStop = typeof schema.stops.$inferInsert;

export function createMockStop(overrides?: Partial<MockStop>): MockStop {
	const id = uniqueId();
	return {
		organization_id: '', // Must be provided
		map_id: '', // Must be provided
		location_id: '', // Must be provided
		contact_name: `Contact ${id}`,
		contact_phone: `555-${String(counter).padStart(4, '0')}`,
		notes: null,
		delivery_index: null,
		driver_id: null,
		...overrides
	};
}

export function createMockStopRow(overrides?: Partial<Stop>): Stop {
	const id = uniqueId();
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		map_id: '',
		location_id: '',
		driver_id: null,
		delivery_index: null,
		contact_name: `Contact ${id}`,
		contact_phone: `555-${String(counter).padStart(4, '0')}`,
		notes: null,
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		...overrides
	};
}

// ============================================================================
// Depot
// ============================================================================

export type MockDepot = typeof schema.depots.$inferInsert;

export function createMockDepot(overrides?: Partial<MockDepot>): MockDepot {
	return {
		organization_id: '', // Must be provided
		location_id: '', // Must be provided
		name: `Depot ${uniqueId()}`,
		default_depot: false,
		...overrides
	};
}

export function createMockDepotRow(overrides?: Partial<Depot>): Depot {
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		location_id: '',
		name: `Depot ${uniqueId()}`,
		default_depot: false,
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		...overrides
	};
}

// ============================================================================
// Route
// ============================================================================

export type MockRoute = typeof schema.routes.$inferInsert;

export function createMockRoute(overrides?: Partial<MockRoute>): MockRoute {
	return {
		organization_id: '', // Must be provided
		map_id: '', // Must be provided
		driver_id: '', // Must be provided
		depot_id: '', // Must be provided
		geometry: {
			type: 'LineString',
			coordinates: [
				[-81.9579, 28.0348],
				[-81.955, 28.04],
				[-81.95, 28.045]
			]
		},
		duration: '3600', // 1 hour in seconds
		...overrides
	};
}

export function createMockRouteRow(overrides?: Partial<Route>): Route {
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		map_id: '',
		driver_id: '',
		depot_id: '',
		geometry: {
			type: 'LineString',
			coordinates: [
				[-81.9579, 28.0348],
				[-81.955, 28.04],
				[-81.95, 28.045]
			]
		},
		duration: '3600',
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		...overrides
	};
}

// ============================================================================
// LoginToken
// ============================================================================

export type MockLoginToken = typeof schema.loginTokens.$inferInsert;

export function createMockLoginToken(
	overrides?: Partial<MockLoginToken>
): MockLoginToken {
	return {
		organization_id: '', // Must be provided
		user_id: '', // Must be provided
		token_hash: `test-token-hash-${uniqueId()}`,
		type: 'login_token',
		expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
		...overrides
	};
}

// ============================================================================
// Invitation
// ============================================================================

export type MockInvitation = typeof schema.invitations.$inferInsert;

export function createMockInvitation(
	overrides?: Partial<MockInvitation>
): MockInvitation {
	const id = uniqueId();
	return {
		organization_id: '', // Must be provided
		email: `invite-${id}@example.com`,
		role: 'member',
		token_hash: `test-invite-hash-${id}`,
		expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
		...overrides
	};
}

export function createMockInvitationRow(
	overrides?: Partial<Invitation>
): Invitation {
	const id = uniqueId();
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		created_at: new Date(),
		created_by: null,
		updated_at: new Date(),
		updated_by: null,
		email: `invite-${id}@example.com`,
		role: 'member',
		token_hash: `test-invite-hash-${id}`,
		expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		used_at: null,
		mail_record_id: null,
		...overrides
	};
}

// ============================================================================
// MailRecord
// ============================================================================

export type MockMailRecord = typeof schema.mailRecords.$inferInsert;

export function createMockMailRecord(
	overrides?: Partial<MockMailRecord>
): MockMailRecord {
	const id = uniqueId();
	return {
		organization_id: '', // Must be provided
		resend_id: `resend-${id}`,
		type: 'invitation',
		to_email: `recipient-${id}@example.com`,
		from_email: 'noreply@example.com',
		status: 'sent',
		...overrides
	};
}

export function createMockMailRecordRow(
	overrides?: Partial<MailRecord>
): MailRecord {
	const id = uniqueId();
	return {
		id: crypto.randomUUID(),
		organization_id: '',
		created_at: new Date(),
		resend_id: `resend-${id}`,
		type: 'invitation',
		to_email: `recipient-${id}@example.com`,
		from_email: 'noreply@example.com',
		subject: null,
		status: 'sent',
		delivered_at: null,
		bounced_at: null,
		...overrides
	};
}

// ============================================================================
// RouteShare
// ============================================================================

export type MockRouteShare = typeof schema.routeShares.$inferInsert;

export function createMockRouteShare(
	overrides?: Partial<MockRouteShare>
): MockRouteShare {
	return {
		organization_id: '', // Must be provided
		route_id: '', // Must be provided
		share_type: 'email',
		access_token_hash: `share-token-${uniqueId()}`,
		expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
		...overrides
	};
}

// ============================================================================
// DriverMapMembership
// ============================================================================

export type MockDriverMapMembership =
	typeof schema.driverMapMemberships.$inferInsert;

export function createMockDriverMapMembership(
	overrides?: Partial<MockDriverMapMembership>
): MockDriverMapMembership {
	return {
		organization_id: '', // Must be provided
		driver_id: '', // Must be provided
		map_id: '', // Must be provided
		...overrides
	};
}

// ============================================================================
// Matrix
// ============================================================================

export type MockMatrix = typeof schema.matrices.$inferInsert;

export function createMockMatrix(overrides?: Partial<MockMatrix>): MockMatrix {
	return {
		organization_id: '', // Must be provided
		map_id: '', // Must be provided
		inputsHash: `matrix-hash-${uniqueId()}`,
		matrix: [
			[0, 100, 200],
			[100, 0, 150],
			[200, 150, 0]
		], // 3x3 sample distance matrix
		...overrides
	};
}

// ============================================================================
// OptimizationJob
// ============================================================================

export type MockOptimizationJob = typeof schema.optimizationJobs.$inferInsert;

export function createMockOptimizationJob(
	overrides?: Partial<MockOptimizationJob>
): MockOptimizationJob {
	return {
		organization_id: '', // Must be provided
		map_id: '', // Must be provided
		matrix_id: '', // Must be provided
		depot_id: '', // Must be provided
		status: 'pending',
		...overrides
	};
}

// ============================================================================
// CreditTransaction (Billing)
// ============================================================================

export type MockCreditTransaction =
	typeof schema.creditTransactions.$inferInsert;

export function createMockCreditTransaction(
	overrides?: Partial<MockCreditTransaction>
): MockCreditTransaction {
	return {
		organization_id: '', // Must be provided
		type: 'purchase',
		amount: 200,
		expires_at: null,
		description: 'Test credit grant',
		...overrides
	};
}

// ============================================================================
// Constants
// ============================================================================

export const ALL_PERMISSIONS: Permission[] = [
	'resources:read',
	'resources:create',
	'resources:update',
	'resources:delete',
	'users:read',
	'users:create',
	'users:update',
	'users:delete',
	'routes:read',
	'billing:read',
	'billing:update'
];
