import {
	magicInviteSchema,
	magicLoginSchema,
	type CreateMagicInvite,
	type CreateMagicLogin,
	type MagicInvite,
	type MagicLink,
	type MagicLogin,
	type PublicUser,
	type User
} from '$lib/schemas';
import { db } from '$lib/server/db';
import { magicLinks, users } from '$lib/server/db/schema';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { generateSessionToken } from './auth';
import { ServiceError } from './errors';
import { userService } from './user.service';

export class MagicLinkService {
	async getMagicLink(magicLinkId: string): Promise<MagicLink> {
		const [magicLink] = await db
			.select()
			.from(magicLinks)
			.where(eq(magicLinks.id, magicLinkId))
			.limit(1);

		if (!magicLink) {
			throw ServiceError.notFound("Couldn't find magic link");
		}
		return magicLink;
	}

	async getMagicLinks(organizationId: string): Promise<MagicLink[]> {
		return db.select().from(magicLinks).where(eq(magicLinks.organization_id, organizationId));
	}

	async hashToken(raw: string) {
		return hash(raw, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
	}

	async getMagicLinkFromToken(token: string): Promise<MagicLink | null> {
		const hashed = await this.hashToken(token);

		// Directly fetch the specific magic link by ID
		const [magicLink] = await db
			.select()
			.from(magicLinks)
			.where(eq(magicLinks.token_hash, hashed))
			.limit(1);

		if (!magicLink) {
			return null;
		}

		return magicLink;
	}

	async createMagicInvite(
		magicInviteData: CreateMagicInvite,
		organization_id: string
	): Promise<{ invite: MagicInvite; token: string }> {
		if (
			magicInviteData.invitee_organization_id &&
			magicInviteData.invitee_organization_id != organization_id
		) {
			throw ServiceError.forbidden("Can't create invite to another organization");
		}

		const token = generateSessionToken();
		const tokenHash = await this.hashToken(token);
		const [newMagicInvite] = await db
			.insert(magicLinks)
			.values({
				organization_id: organization_id,
				token_hash: tokenHash, // Store hash of secret only
				...magicInviteData
			})
			.returning();

		return { invite: newMagicInvite as MagicInvite, token: token };
	}

	async createMagicLogin(
		magicLoginData: CreateMagicLogin
	): Promise<{ login: MagicLogin; token: string }> {
		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.id, magicLoginData.user_id))
			.limit(1);

		if (!user) {
			throw ServiceError.notFound(`Couldn't find user with id ${magicLoginData.user_id}`);
		}

		const token = generateSessionToken();
		const tokenHash = await this.hashToken(token);

		const [magicLogin] = await db
			.insert(magicLinks)
			.values({
				organization_id: user.organization_id,
				token_hash: tokenHash, // Store hash of secret only
				...magicLoginData
			})
			.returning();

		return { login: magicLogin as MagicLogin, token: token };
	}

	private isExpired(date: Date) {
		return Date.now() >= date.getTime();
	}

	// use invite link
	async useMagicInvite(token: string): Promise<User> {
		const magicLink = await this.getMagicLinkFromToken(token);

		if (!magicLink) {
			throw ServiceError.unauthorized('Invalid invite link');
		}

		const magicInvite = magicInviteSchema.parse(magicLink);

		if (this.isExpired(magicInvite.expires_at)) {
			throw ServiceError.unauthorized('Invite expired');
		}

		if (magicInvite.used_at != null) {
			throw ServiceError.unauthorized('Invite already redeemed');
		}

		// Use transaction to ensure atomicity
		return await db.transaction(async (tx) => {
			// Mark invite as used first to prevent race conditions
			await tx
				.update(magicLinks)
				.set({ used_at: new Date() })
				.where(eq(magicLinks.id, magicInvite.id));

			// Create user
			const user = await userService.createUser(
				magicInvite.email,
				undefined, // password
				magicInvite.invitee_organization_id
			);

			return user;
		});
	}

	async validateMagicLogin(token: string): Promise<PublicUser> {
		const magicLink = await this.getMagicLinkFromToken(token);

		if (!magicLink) {
			throw ServiceError.unauthorized('Invalid login link');
		}

		const magicLogin = magicLoginSchema.parse(magicLink);

		if (this.isExpired(magicLogin.expires_at)) {
			throw ServiceError.unauthorized('Login link expired');
		}

		const user = await userService.getPublicUser(magicLogin.user_id, magicLogin.organization_id);

		return user;
	}
}

export const magicLinkService = new MagicLinkService();
