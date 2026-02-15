/**
 * User Service Tests
 *
 * Verifies that creating a user and organization does NOT trigger any Stripe setup.
 * Stripe customer/subscription creation now happens lazily on first upgrade.
 *
 * Run with: npm run test:unit -- --run user.service.integration
 */
import { organizations, users } from '$lib/server/db/schema';
import { db, withTestTransaction } from '$lib/testing';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { userService } from './user.service';

describe('UserService - Organization Creation', () => {
	it('creates an org with no Stripe fields when creating a new user', async () => {
		await withTestTransaction(async () => {
			const email = `test-${Date.now()}@example.com`;

			// Create user without organization_id - triggers org creation
			const user = await userService.createUser({ email, role: 'admin' });

			expect(user.id).toBeDefined();
			expect(user.organization_id).toBeDefined();
			expect(user.email).toBe(email);

			// Verify the organization has no Stripe fields set
			const [org] = await db
				.select()
				.from(organizations)
				.where(eq(organizations.id, user.organization_id))
				.limit(1);

			expect(org).toBeDefined();
			expect(org.stripe_customer_id).toBeNull();
			expect(org.stripe_subscription_id).toBeNull();
			expect(org.subscription_status).toBeNull();
		});
	});

	it('assigns the user to the newly created organization', async () => {
		await withTestTransaction(async () => {
			const email = `test-${Date.now()}@example.com`;

			const user = await userService.createUser({ email, role: 'admin' });

			// Verify the user record points to the org
			const [dbUser] = await db
				.select()
				.from(users)
				.where(eq(users.id, user.id))
				.limit(1);

			expect(dbUser).toBeDefined();
			expect(dbUser.organization_id).toBe(user.organization_id);
			expect(dbUser.role).toBe('admin');
		});
	});

	it('uses an existing organization when organization_id is provided', async () => {
		await withTestTransaction(async () => {
			// First create a user to get an org
			const firstUser = await userService.createUser({
				email: `first-${Date.now()}@example.com`,
				role: 'admin'
			});

			// Create a second user in the same org
			const secondUser = await userService.createUser({
				email: `second-${Date.now()}@example.com`,
				role: 'member',
				organization_id: firstUser.organization_id
			});

			expect(secondUser.organization_id).toBe(firstUser.organization_id);
			expect(secondUser.role).toBe('member');
		});
	});
});
