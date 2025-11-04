import type { Organization, User } from '$lib/schemas';
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
