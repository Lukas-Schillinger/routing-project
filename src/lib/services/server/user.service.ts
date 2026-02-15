import type {
	CreateUser,
	Organization,
	PublicUser,
	UpdateOrganization,
	UpdateUser,
	UpdateUserRole,
	User
} from '$lib/schemas';
import { db } from '$lib/server/db';
import { invitations, organizations, users } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

/**
 * Drizzle column selection for PublicUser queries.
 * Use in .select() to avoid fetching passwordHash from DB.
 */
export const publicUserColumns = {
	id: users.id,
	organization_id: users.organization_id,
	created_at: users.created_at,
	created_by: users.created_by,
	updated_at: users.updated_at,
	updated_by: users.updated_by,
	name: users.name,
	email: users.email,
	role: users.role,
	email_confirmed_at: users.email_confirmed_at
} as const;

// Type check: ensures publicUserColumns stays in sync with PublicUser
export const _columnCheck: Record<keyof PublicUser, unknown> =
	publicUserColumns;

export class UserService {
	async getUser(userId: string, organizationId: string): Promise<User> {
		const [user] = await db
			.select()
			.from(users)
			.where(
				and(eq(users.id, userId), eq(users.organization_id, organizationId))
			)
			.limit(1);

		if (!user) {
			throw ServiceError.notFound('User not found');
		}

		return user;
	}

	/**
	 * Transforms a full User object to PublicUser by removing passwordHash.
	 * Use for single-item returns (after .returning()).
	 */
	toPublicUser(user: User): PublicUser {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { passwordHash, ...publicUser } = user;
		return publicUser;
	}

	async getPublicUser(
		userId: string,
		organization_id: string
	): Promise<PublicUser> {
		const user = await this.getUser(userId, organization_id);
		return this.toPublicUser(user);
	}

	async getPublicUsers(organizationId: string): Promise<PublicUser[]> {
		return await db
			.select(publicUserColumns)
			.from(users)
			.where(eq(users.organization_id, organizationId));
	}

	/** Does not validate requester organization ID! Used by magic links service */
	async getAnyUser(userId: string): Promise<User | null> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		return user;
	}

	/** Does not validate requester organization ID! */
	async findAnyUserByEmail(email: string): Promise<User | null> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
		return user;
	}

	async updateUser(
		userId: string,
		organizationId: string,
		data: UpdateUser
	): Promise<PublicUser> {
		const user = await this.getUser(userId, organizationId);

		const [updatedUser] = await db
			.update(users)
			.set({
				name: data.name !== undefined ? data.name : user.name,
				updated_at: new Date(),
				updated_by: userId
			})
			.where(
				and(eq(users.id, userId), eq(users.organization_id, organizationId))
			)
			.returning();

		return this.toPublicUser(updatedUser);
	}

	async updateUserRole(
		userId: string,
		organizationId: string,
		data: UpdateUserRole,
		updatedByUserId: string
	): Promise<PublicUser> {
		await this.getUser(userId, organizationId);

		const [updatedUser] = await db
			.update(users)
			.set({
				role: data.role,
				updated_at: new Date(),
				updated_by: updatedByUserId
			})
			.where(
				and(eq(users.id, userId), eq(users.organization_id, organizationId))
			)
			.returning();

		return this.toPublicUser(updatedUser);
	}

	/** Update user's password hash - used by password reset flow */
	async updatePasswordHash(
		userId: string,
		organizationId: string,
		passwordHash: string
	): Promise<void> {
		await this.getUser(userId, organizationId);

		await db
			.update(users)
			.set({
				passwordHash,
				updated_at: new Date(),
				updated_by: userId
			})
			.where(
				and(eq(users.id, userId), eq(users.organization_id, organizationId))
			);
	}

	async deleteUser(
		userId: string,
		organizationId: string
	): Promise<{ success: true }> {
		// Verify user exists and belongs to organization
		const user = await this.getUser(userId, organizationId);

		await db
			.delete(users)
			.where(
				and(eq(users.id, userId), eq(users.organization_id, organizationId))
			);

		// delete their invitations so they can be invited again
		await db.delete(invitations).where(eq(invitations.email, user.email));

		return { success: true };
	}

	/**
	 * Creates a new organization. No Stripe interaction at signup — orgs start on Free tier.
	 */
	private async generateOrganization(): Promise<string> {
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 8);
		const orgName = `Organization-${timestamp}-${randomSuffix}`;

		const [org] = await db
			.insert(organizations)
			.values({ name: orgName })
			.returning({ id: organizations.id });

		return org.id;
	}

	async createUser(data: CreateUser): Promise<User> {
		// If no organization ID provided, create a new organization (starts on Free tier)
		const orgId = data.organization_id
			? data.organization_id
			: await this.generateOrganization();

		// Create the user with the organization ID
		const [result] = await db
			.insert(users)
			.values({
				...data,
				organization_id: orgId
			})
			.returning();

		return result;
	}
}

export class OrganizationService {
	async getOrganization(organizationId: string): Promise<Organization> {
		const [organization] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!organization) {
			throw ServiceError.notFound('Organization not found');
		}

		return organization;
	}

	async updateOrganization(
		organizationId: string,
		data: UpdateOrganization,
		userId: string
	) {
		const [organization] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!organization) {
			throw ServiceError.notFound('Organization not found');
		}

		const [updatedOrganization] = await db
			.update(organizations)
			.set({
				name: data.name ? data.name : organization.name,
				updated_at: new Date(),
				updated_by: userId
			})
			.where(eq(organizations.id, organizationId))
			.returning();

		return updatedOrganization;
	}
}

export const userService = new UserService();
export const organizationService = new OrganizationService();
