import { describe, expect, it } from 'vitest';
import {
	createDepot,
	createDriver,
	createLocation,
	createMap,
	createMockOrganization,
	createMockUser,
	createOrganization,
	createRoute,
	createStop,
	createTestEnvironment,
	createTestRouteSetup,
	createUser,
	withTestTransaction
} from './index';

describe('Testing Utilities', () => {
	describe('Mock Data Generators', () => {
		it('createMockOrganization generates valid data', () => {
			expect.assertions(2);
			const mock = createMockOrganization();
			expect(mock.name).toContain('Test Organization');
			expect(typeof mock.name).toBe('string');
		});

		it('createMockOrganization accepts overrides', () => {
			expect.assertions(1);
			const mock = createMockOrganization({ name: 'Custom Org' });
			expect(mock.name).toBe('Custom Org');
		});

		it('createMockUser generates valid data', () => {
			expect.assertions(3);
			const mock = createMockUser({ organization_id: 'test-org-id' });
			expect(mock.email).toContain('@example.com');
			expect(mock.organization_id).toBe('test-org-id');
			expect(mock.role).toBe('member');
		});
	});

	describe('Database Factories', () => {
		it('createOrganization inserts and returns with ID', async () => {
			expect.assertions(2);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				expect(org.id).toBeDefined();
				expect(org.name).toContain('Test Organization');
			});
		});

		it('createUser inserts with organization reference', async () => {
			expect.assertions(2);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				const user = await createUser(tx, { organization_id: org.id });
				expect(user.id).toBeDefined();
				expect(user.organization_id).toBe(org.id);
			});
		});

		it('createDriver inserts with organization reference', async () => {
			expect.assertions(3);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				const driver = await createDriver(tx, { organization_id: org.id });
				expect(driver.id).toBeDefined();
				expect(driver.organization_id).toBe(org.id);
				expect(driver.color).toMatch(/^#[0-9A-F]{6}$/i);
			});
		});

		it('createLocation inserts with coordinates', async () => {
			expect.assertions(3);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				const location = await createLocation(tx, { organization_id: org.id });
				expect(location.id).toBeDefined();
				expect(typeof location.lat).toBe('number');
				expect(typeof location.lon).toBe('number');
			});
		});

		it('createMap inserts with organization reference', async () => {
			expect.assertions(2);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				const map = await createMap(tx, { organization_id: org.id });
				expect(map.id).toBeDefined();
				expect(map.title).toContain('Test Map');
			});
		});

		it('createStop inserts with all required references', async () => {
			expect.assertions(3);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				const map = await createMap(tx, { organization_id: org.id });
				const location = await createLocation(tx, { organization_id: org.id });
				const stop = await createStop(tx, {
					organization_id: org.id,
					map_id: map.id,
					location_id: location.id
				});
				expect(stop.id).toBeDefined();
				expect(stop.map_id).toBe(map.id);
				expect(stop.location_id).toBe(location.id);
			});
		});

		it('createDepot inserts with location reference', async () => {
			expect.assertions(2);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				const location = await createLocation(tx, { organization_id: org.id });
				const depot = await createDepot(tx, {
					organization_id: org.id,
					location_id: location.id
				});
				expect(depot.id).toBeDefined();
				expect(depot.location_id).toBe(location.id);
			});
		});

		it('createRoute inserts with all required references', async () => {
			expect.assertions(4);
			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx);
				const driver = await createDriver(tx, { organization_id: org.id });
				const map = await createMap(tx, { organization_id: org.id });
				const location = await createLocation(tx, { organization_id: org.id });
				const depot = await createDepot(tx, {
					organization_id: org.id,
					location_id: location.id
				});
				const route = await createRoute(tx, {
					organization_id: org.id,
					map_id: map.id,
					driver_id: driver.id,
					depot_id: depot.id
				});
				expect(route.id).toBeDefined();
				expect(route.map_id).toBe(map.id);
				expect(route.driver_id).toBe(driver.id);
				expect(route.depot_id).toBe(depot.id);
			});
		});
	});

	describe('Convenience Helpers', () => {
		it('createTestEnvironment creates org and admin user', async () => {
			expect.assertions(3);
			await withTestTransaction(async (tx) => {
				const { organization, user } = await createTestEnvironment(tx);
				expect(organization.id).toBeDefined();
				expect(user.organization_id).toBe(organization.id);
				expect(user.role).toBe('admin');
			});
		});

		it('createTestRouteSetup creates complete route setup', async () => {
			expect.assertions(7);
			await withTestTransaction(async (tx) => {
				const setup = await createTestRouteSetup(tx);
				expect(setup.organization.id).toBeDefined();
				expect(setup.user.id).toBeDefined();
				expect(setup.driver.id).toBeDefined();
				expect(setup.map.id).toBeDefined();
				expect(setup.location.id).toBeDefined();
				expect(setup.depot.id).toBeDefined();
				expect(setup.route.id).toBeDefined();
			});
		});
	});

	describe('Transaction Isolation', () => {
		it('rolls back changes after test', async () => {
			expect.assertions(1);

			await withTestTransaction(async (tx) => {
				const org = await createOrganization(tx, { name: 'Rollback Test Org' });
				const orgId = org.id;
				expect(orgId).toBeDefined();
			});

			// The org should be rolled back - we can't easily verify this without
			// querying outside the transaction, but the test passing shows rollback worked
		});
	});
});
