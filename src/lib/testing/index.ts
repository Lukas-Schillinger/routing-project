/**
 * Test Utilities
 *
 * Shared utilities for testing the routing-project application.
 *
 * @example
 * ```ts
 * import {
 *   withTestTransaction,
 *   createOrganization,
 *   createUser,
 *   createTestEnvironment
 * } from '$lib/testing';
 *
 * it('creates a user', async () => {
 *   await withTestTransaction(async (tx) => {
 *     const { organization, user } = await createTestEnvironment(tx);
 *     expect(user.organization_id).toBe(organization.id);
 *   });
 * });
 * ```
 */

// Database helpers
export { withTestTransaction, db, type TestTransaction } from './db';

// Mock factories - data generators
export {
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
	createMockOptimizationJob
} from './factories';

// Mock factories - DB insertion
export {
	createOrganization,
	createUser,
	createDriver,
	createLocation,
	createMap,
	createStop,
	createDepot,
	createRoute,
	createLoginToken,
	createInvitation,
	createMailRecord,
	createRouteShare,
	createDriverMapMembership,
	createMatrix,
	createOptimizationJob
} from './factories';

// Mock factories - convenience helpers
export { createTestEnvironment, createTestRouteSetup } from './factories';

// Mock factories - types
export type {
	MockOrganization,
	MockUser,
	MockDriver,
	MockLocation,
	MockMap,
	MockStop,
	MockDepot,
	MockRoute,
	MockLoginToken,
	MockInvitation,
	MockMailRecord,
	MockRouteShare,
	MockDriverMapMembership,
	MockMatrix,
	MockOptimizationJob
} from './factories';

// Service mocks
export {
	createMockResend,
	createMockRenderClient,
	createMockGeocodingService,
	createMockDistanceMatrixService,
	createMockNavigationService,
	createMockR2Service,
	createMockSqsService
} from './mocks';

// Test data - raw input data for geocoding tests
import inputDataJson from './data/input_data.json';
export const inputData: Array<{
	name: string;
	address: string;
	phone: string;
	notes: string;
}> = inputDataJson;
