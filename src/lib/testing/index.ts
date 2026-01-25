/**
 * Test Utilities
 *
 * Shared utilities for testing the routing-project application.
 *
 * @example
 * ```ts
 * import { withTestTransaction, db, createTestEnvironment } from '$lib/testing';
 * import { userService } from '$lib/services/server/user.service';
 *
 * it('creates a user', async () => {
 *   await withTestTransaction(async () => {
 *     // All db operations (including service calls) use the test transaction
 *     const { organization } = await createTestEnvironment(db);
 *     const user = await userService.createUser({ ... }, organization.id);
 *     expect(user.organization_id).toBe(organization.id);
 *     // No cleanup needed - auto rollback!
 *   });
 * });
 * ```
 */

// Database helpers
export { withTestTransaction, db } from './db';

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
	createMockOptimizationJob,
	// Billing
	createMockPlan,
	createMockSubscription,
	createMockCreditTransaction
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
	createOptimizationJob,
	// Billing
	createPlan,
	createSubscription,
	createCreditTransaction
} from './factories';

// Mock factories - convenience helpers
export {
	createTestEnvironment,
	createTestRouteSetup,
	createBillingTestEnvironment
} from './factories';

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
	MockOptimizationJob,
	// Billing
	MockPlan,
	MockSubscription,
	MockCreditTransaction
} from './factories';

// Service mocks
export {
	createMockResend,
	createMockRenderClient,
	createMockGeocodingService,
	createMockDistanceMatrixService,
	createMockNavigationService,
	createMockR2Service,
	createMockSqsService,
	// Stripe
	mockStripeClient,
	mockStripeState
} from './mocks';

// Stripe fixtures - mock Stripe objects for testing
export {
	createMockStripeSubscription,
	createMockStripeInvoice,
	createMockStripeCheckoutSession,
	createCheckoutCompletedEvent,
	createInvoicePaidEvent,
	createInvoicePaymentFailedEvent,
	createSubscriptionCreatedEvent,
	createSubscriptionUpdatedEvent,
	createSubscriptionDeletedEvent
} from './stripe/fixtures';

// Stripe test clocks - for integration tests with real Stripe API
export {
	createStripeTestClock,
	requireStripeTestKey,
	hasStripeTestKey,
	type StripeTestClockHelper
} from './stripe/test-clocks';

// Test data - raw input data for geocoding tests
import inputDataJson from './data/input_data.json';
export const inputData: Array<{
	name: string;
	address: string;
	phone: string;
	notes: string;
}> = inputDataJson;
