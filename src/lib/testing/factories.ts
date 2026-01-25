/**
 * Mock Factories
 * Generate test data for all major models.
 *
 * Each model has two functions:
 * - `createMock<Model>(overrides?)` - returns plain object with fake data
 * - `create<Model>(overrides?)` - inserts into DB and returns with generated ID
 *
 * All create* functions use the context-aware `db` which automatically
 * participates in test transactions when called within withTestTransaction().
 */
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { generateRandomColor } from '$lib/utils';
import { eq } from 'drizzle-orm';
import locationsData from './data/locations.json';

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

export async function createOrganization(
	overrides?: Partial<MockOrganization>
): Promise<typeof schema.organizations.$inferSelect> {
	const data = createMockOrganization(overrides);
	const [result] = await db
		.insert(schema.organizations)
		.values(data)
		.returning();
	return result;
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

export async function createUser(
	overrides: Partial<MockUser> & { organization_id: string }
): Promise<typeof schema.users.$inferSelect> {
	const data = createMockUser(overrides);
	const [result] = await db.insert(schema.users).values(data).returning();
	return result;
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

export async function createDriver(
	overrides: Partial<MockDriver> & { organization_id: string }
): Promise<typeof schema.drivers.$inferSelect> {
	const data = createMockDriver(overrides);
	const [result] = await db.insert(schema.drivers).values(data).returning();
	return result;
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

export async function createLocation(
	overrides: Partial<MockLocation> & { organization_id: string }
): Promise<typeof schema.locations.$inferSelect> {
	const data = createMockLocation(overrides);
	const [result] = await db.insert(schema.locations).values(data).returning();
	return result;
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

export async function createMap(
	overrides: Partial<MockMap> & { organization_id: string }
): Promise<typeof schema.maps.$inferSelect> {
	const data = createMockMap(overrides);
	const [result] = await db.insert(schema.maps).values(data).returning();
	return result;
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

export async function createStop(
	overrides: Partial<MockStop> & {
		organization_id: string;
		map_id: string;
		location_id: string;
	}
): Promise<typeof schema.stops.$inferSelect> {
	const data = createMockStop(overrides);
	const [result] = await db.insert(schema.stops).values(data).returning();
	return result;
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

export async function createDepot(
	overrides: Partial<MockDepot> & {
		organization_id: string;
		location_id: string;
	}
): Promise<typeof schema.depots.$inferSelect> {
	const data = createMockDepot(overrides);
	const [result] = await db.insert(schema.depots).values(data).returning();
	return result;
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

export async function createRoute(
	overrides: Partial<MockRoute> & {
		organization_id: string;
		map_id: string;
		driver_id: string;
		depot_id: string;
	}
): Promise<typeof schema.routes.$inferSelect> {
	const data = createMockRoute(overrides);
	const [result] = await db.insert(schema.routes).values(data).returning();
	return result;
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

export async function createLoginToken(
	overrides: Partial<MockLoginToken> & {
		organization_id: string;
		user_id: string;
	}
): Promise<typeof schema.loginTokens.$inferSelect> {
	const data = createMockLoginToken(overrides);
	const [result] = await db.insert(schema.loginTokens).values(data).returning();
	return result;
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

export async function createInvitation(
	overrides: Partial<MockInvitation> & { organization_id: string }
): Promise<typeof schema.invitations.$inferSelect> {
	const data = createMockInvitation(overrides);
	const [result] = await db.insert(schema.invitations).values(data).returning();
	return result;
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

export async function createMailRecord(
	overrides: Partial<MockMailRecord> & { organization_id: string }
): Promise<typeof schema.mailRecords.$inferSelect> {
	const data = createMockMailRecord(overrides);
	const [result] = await db.insert(schema.mailRecords).values(data).returning();
	return result;
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

export async function createRouteShare(
	overrides: Partial<MockRouteShare> & {
		organization_id: string;
		route_id: string;
	}
): Promise<typeof schema.routeShares.$inferSelect> {
	const data = createMockRouteShare(overrides);
	const [result] = await db.insert(schema.routeShares).values(data).returning();
	return result;
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

export async function createDriverMapMembership(
	overrides: Partial<MockDriverMapMembership> & {
		organization_id: string;
		driver_id: string;
		map_id: string;
	}
): Promise<typeof schema.driverMapMemberships.$inferSelect> {
	const data = createMockDriverMapMembership(overrides);
	const [result] = await db
		.insert(schema.driverMapMemberships)
		.values(data)
		.returning();
	return result;
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

export async function createMatrix(
	overrides: Partial<MockMatrix> & {
		organization_id: string;
		map_id: string;
	}
): Promise<typeof schema.matrices.$inferSelect> {
	const data = createMockMatrix(overrides);
	const [result] = await db.insert(schema.matrices).values(data).returning();
	return result;
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

export async function createOptimizationJob(
	overrides: Partial<MockOptimizationJob> & {
		organization_id: string;
		map_id: string;
		matrix_id: string;
		depot_id: string;
	}
): Promise<typeof schema.optimizationJobs.$inferSelect> {
	const data = createMockOptimizationJob(overrides);
	const [result] = await db
		.insert(schema.optimizationJobs)
		.values(data)
		.returning();
	return result;
}

// ============================================================================
// Convenience: Full Test Setup
// ============================================================================

/**
 * Creates a complete test environment with an organization and admin user.
 * Useful as a starting point for most tests.
 */
export async function createTestEnvironment() {
	const organization = await createOrganization();
	const user = await createUser({
		organization_id: organization.id,
		role: 'admin'
	});

	return { organization, user };
}

/**
 * Creates a complete route setup for testing optimization flows.
 * Includes: organization, user, driver, map, location, depot, route,
 * and billing (plans, subscription, credits).
 */
export async function createTestRouteSetup() {
	const { organization, user, freePlan, proPlan, subscription, credits } =
		await createBillingTestEnvironment();

	const driver = await createDriver({
		organization_id: organization.id,
		created_by: user.id
	});

	const map = await createMap({
		organization_id: organization.id,
		created_by: user.id
	});

	const location = await createLocation({
		organization_id: organization.id
	});

	const depot = await createDepot({
		organization_id: organization.id,
		location_id: location.id,
		created_by: user.id,
		default_depot: true
	});

	const route = await createRoute({
		organization_id: organization.id,
		map_id: map.id,
		driver_id: driver.id,
		depot_id: depot.id
	});

	return {
		organization,
		user,
		driver,
		map,
		location,
		depot,
		route,
		// Billing
		freePlan,
		proPlan,
		subscription,
		credits
	};
}

// ============================================================================
// Plan (Billing)
// ============================================================================

export type MockPlan = typeof schema.plans.$inferInsert;

export function createMockPlan(overrides?: Partial<MockPlan>): MockPlan {
	const id = uniqueId();
	return {
		name: 'free',
		display_name: `Test Plan ${id}`,
		stripe_price_id: `price_mock_${id}`,
		monthly_credits: 200,
		features: { fleet_management: false },
		...overrides
	};
}

export async function createPlan(
	overrides?: Partial<MockPlan>
): Promise<typeof schema.plans.$inferSelect> {
	const data = createMockPlan(overrides);
	const [result] = await db.insert(schema.plans).values(data).returning();
	return result;
}

// ============================================================================
// Subscription (Billing)
// ============================================================================

export type MockSubscription = typeof schema.subscriptions.$inferInsert;

export function createMockSubscription(
	overrides?: Partial<MockSubscription>
): MockSubscription {
	const id = uniqueId();
	const now = new Date();
	const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
	return {
		organization_id: '', // Must be provided
		plan_id: '', // Must be provided
		stripe_customer_id: `cus_mock_${id}`,
		stripe_subscription_id: `sub_mock_${id}`,
		status: 'active',
		period_starts_at: now,
		period_ends_at: periodEnd,
		...overrides
	};
}

export async function createSubscription(
	overrides: Partial<MockSubscription> & {
		organization_id: string;
		plan_id: string;
	}
): Promise<typeof schema.subscriptions.$inferSelect> {
	const data = createMockSubscription(overrides);
	const [result] = await db
		.insert(schema.subscriptions)
		.values(data)
		.returning();
	return result;
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
		type: 'subscription_grant',
		amount: 200,
		expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		description: 'Test credit grant',
		...overrides
	};
}

export async function createCreditTransaction(
	overrides: Partial<MockCreditTransaction> & { organization_id: string }
): Promise<typeof schema.creditTransactions.$inferSelect> {
	const data = createMockCreditTransaction(overrides);
	const [result] = await db
		.insert(schema.creditTransactions)
		.values(data)
		.returning();
	return result;
}

// ============================================================================
// Convenience: Billing Test Environment
// ============================================================================

/**
 * Creates a complete billing test environment with:
 * - Organization and admin user
 * - Free and Pro plans (reused if they already exist)
 * - Subscription on Free plan
 *
 * Note: Plans are shared across tests since the schema enforces exactly
 * 'free' and 'pro' plan names. Tests should NOT delete plans in cleanup.
 */
export async function createBillingTestEnvironment() {
	const { organization, user } = await createTestEnvironment();
	const id = uniqueId();

	// Find or create plans (they're shared across tests due to unique name constraint)
	let [freePlan] = await db
		.select()
		.from(schema.plans)
		.where(eq(schema.plans.name, 'free'));

	if (!freePlan) {
		[freePlan] = await db
			.insert(schema.plans)
			.values({
				name: 'free',
				display_name: 'Free',
				stripe_price_id: `price_free_test_${id}`,
				monthly_credits: 200,
				features: { fleet_management: false }
			})
			.returning();
	}

	let [proPlan] = await db
		.select()
		.from(schema.plans)
		.where(eq(schema.plans.name, 'pro'));

	if (!proPlan) {
		[proPlan] = await db
			.insert(schema.plans)
			.values({
				name: 'pro',
				display_name: 'Pro',
				stripe_price_id: `price_pro_test_${id}`,
				monthly_credits: 2000,
				features: { fleet_management: true }
			})
			.returning();
	}

	const subscription = await createSubscription({
		organization_id: organization.id,
		plan_id: freePlan.id
	});

	// Grant initial credits (mirrors production behavior on subscription creation)
	const credits = await createCreditTransaction({
		organization_id: organization.id,
		amount: freePlan.monthly_credits,
		type: 'subscription_grant',
		description: 'Initial subscription credits'
	});

	return { organization, user, freePlan, proPlan, subscription, credits };
}
