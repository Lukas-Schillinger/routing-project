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
			email: user.email,
			role: user.role,
			name: user.name
		};
	}

	async getPublicUsers(organizationId: string): Promise<PublicUser[]> {
		return await db
			.select({
				id: users.id,
				created_at: users.created_at,
				updated_at: users.updated_at,
				organization_id: users.organization_id,
				email: users.email,
				role: users.role,
				name: users.name
			})
			.from(users)
			.where(eq(users.organization_id, organizationId));
	}

	/** Does not validate requester organization ID! Used by magic links service */
	async getAnyUser(userId: string): Promise<User | null> {
		const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		return user;
	}

	/** Does not validate requester organization ID! */
	async findAnyUserByEmail(email: string): Promise<User | null> {
		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		return user;
	}

	async updateUser(userId: string, organizationId: string, data: UpdateUser): Promise<PublicUser> {
		const user = await this.getUser(userId, organizationId);

		const [updatedUser] = await db
			.update(users)
			.set({
				name: data.name !== undefined ? data.name : user.name,
				updated_at: new Date(),
				updated_by: userId
			})
			.where(and(eq(users.id, userId), eq(users.organization_id, organizationId)))
			.returning();

		return {
			id: updatedUser.id,
			created_at: updatedUser.created_at,
			updated_at: updatedUser.updated_at,
			organization_id: updatedUser.organization_id,
			name: updatedUser.name,
			email: updatedUser.email,
			role: updatedUser.role
		};
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
			.where(and(eq(users.id, userId), eq(users.organization_id, organizationId)))
			.returning();

		return {
			id: updatedUser.id,
			created_at: updatedUser.created_at,
			updated_at: updatedUser.updated_at,
			organization_id: updatedUser.organization_id,
			name: updatedUser.name,
			email: updatedUser.email,
			role: updatedUser.role
		};
	}

	async deleteUser(userId: string, organizationId: string): Promise<{ success: true }> {
		// Verify user exists and belongs to organization
		const user = await this.getUser(userId, organizationId);

		await db
			.delete(users)
			.where(and(eq(users.id, userId), eq(users.organization_id, organizationId)));

		// delete their invitations so they can be invited again
		await db.delete(invitations).where(eq(invitations.email, user.email));

		return { success: true };
	}

	private async generateOrganization() {
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 8);
		const orgName = `Organization-${timestamp}-${randomSuffix}`;

		// Create a new organization
		const res = await db
			.insert(organizations)
			.values({ name: orgName })
			.returning({ id: organizations.id });
		return res[0].id;
	}

	async createUser(data: CreateUser): Promise<User> {
		// If no organization ID provided, create a new organization with a random name
		const orgId = data.organization_id ? data.organization_id : await this.generateOrganization();

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
	async getOrganization(requestedId: string, requesterId: string): Promise<Organization> {
		const [organization] = await db
			.select()
			.from(organizations)
			.where(and(eq(organizations.id, requestedId), eq(organizations.id, requesterId)))
			.limit(1);

		if (!organization) {
			throw ServiceError.notFound('Organization not found');
		}

		return organization;
	}

	async updateOrganization(
		requestedId: string,
		data: UpdateOrganization,
		requesterId: string,
		userId: string
	) {
		const [organization] = await db
			.select()
			.from(organizations)
			.where(and(eq(organizations.id, requestedId), eq(organizations.id, requesterId)));

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
			.where(eq(organizations.id, requestedId))
			.returning();

		return updatedOrganization;
	}
}

export const userService = new UserService();
export const organizationService = new OrganizationService();
