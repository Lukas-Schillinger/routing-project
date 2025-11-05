import type { Organization, PublicUser, User } from '$lib/schemas';
import { db } from '$lib/server/db';
import { organizations, users } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export class UserService {
	async getUser(userId: string, organizationId: string): Promise<User> {
		const [user] = await db
			.select()
			.from(users)
			.where(and(eq(users.id, userId), eq(users.organization_id, organizationId)))
			.limit(1);

		if (!user) {
			throw ServiceError.notFound('User not found');
		}

		return user;
	}

	async getPublicUser(userId: string, organization_id: string): Promise<PublicUser> {
		const user = await this.getUser(userId, organization_id);
		return {
			id: user.id,
			created_at: user.created_at,
			updated_at: user.updated_at,
			organization_id: user.organization_id,
			email: user.email
		};
	}

	/** Does not validate requester organization ID! */
	async getAnyUser(userId: string): Promise<User | null> {
		const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		return user;
	}

	/** Does not validate requester organization ID! */
	async findAnyUserByEmail(email: string): Promise<User | null> {
		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		return user;
	}

	async createUser(
		email: string,
		passwordHash?: string,
		organizationId?: string | null
	): Promise<User> {
		// If no organization ID provided, create a new organization with a random name
		let orgId = organizationId;

		if (!orgId) {
			// Generate a random organization name
			const timestamp = Date.now();
			const randomSuffix = Math.random().toString(36).substring(2, 8);
			const orgName = `Organization-${timestamp}-${randomSuffix}`;

			// Create a new organization
			const orgResult = await db
				.insert(organizations)
				.values({ name: orgName })
				.returning({ id: organizations.id });
			orgId = orgResult[0].id;
		}

		// Create the user with the organization ID
		const [result] = await db
			.insert(users)
			.values({
				email,
				passwordHash,
				organization_id: orgId
			})
			.returning();

		return result;
	}
}

export class OrganizationService {
	async getOrganization(requestedId: string, requesterId: string): Promise<Organization> {
		const [organization] = await db
			.select()
			.from(organizations)
			.where(and(eq(organizations.id, requestedId), eq(organizations.id, requesterId)))
			.limit(1);

		if (!organization) {
			throw ServiceError.notFound('Organization not found');
		}

		if (organization.id !== requesterId) {
			throw ServiceError.forbidden('Access denied');
		}

		return organization;
	}
}

export const userService = new UserService();
export const organizationService = new OrganizationService();
