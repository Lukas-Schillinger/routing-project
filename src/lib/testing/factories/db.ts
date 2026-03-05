/**
 * DB Factories (server-only)
 *
 * Insert mock data into the database. These require a running DB connection
 * and must NOT be imported in browser/Storybook contexts.
 */
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import {
	createMockOrganization,
	createMockUser,
	createMockDriver,
	createMockLocation,
	createMockMap,
	createMockStop,
	createMockDepot,
	createMockRoute,
	createMockLoginToken,
	createMockInvitation,
	createMockMailRecord,
	createMockRouteShare,
	createMockDriverMapMembership,
	createMockMatrix,
	createMockOptimizationJob,
	createMockCreditTransaction,
	type MockOrganization,
	type MockUser,
	type MockDriver,
	type MockLocation,
	type MockMap,
	type MockStop,
	type MockDepot,
	type MockRoute,
	type MockLoginToken,
	type MockInvitation,
	type MockMailRecord,
	type MockRouteShare,
	type MockDriverMapMembership,
	type MockMatrix,
	type MockOptimizationJob,
	type MockCreditTransaction
} from './mocks';

// ============================================================================
// Organization
// ============================================================================

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

export async function createDriver(
	overrides: Partial<MockDriver> & { organization_id: string }
): Promise<typeof schema.drivers.$inferSelect> {
	const data = createMockDriver(overrides);
	const [result] = await db.insert(schema.drivers).values(data).returning();
	return result;
}

// ============================================================================
// Location
// ============================================================================

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
// CreditTransaction (Billing)
// ============================================================================

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
// Convenience: Full Test Setup
// ============================================================================

export async function createTestEnvironment() {
	const organization = await createOrganization();
	const user = await createUser({
		organization_id: organization.id,
		role: 'admin'
	});
	return { organization, user };
}

export async function createTestRouteSetup() {
	const { organization, user } = await createBillingTestEnvironment();

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

	return { organization, user, driver, map, location, depot, route };
}

export async function createBillingTestEnvironment() {
	const { organization, user } = await createTestEnvironment();
	return { organization, user };
}
