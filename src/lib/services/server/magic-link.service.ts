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
import { magicLinks } from '$lib/server/db/schema';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { randomInt } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';
import { userService } from './user.service';

export class MagicLinkService {
	async getMagicLink(magicLinkId: string, organization_id: string): Promise<MagicLink> {
		const [magicLink] = await db
			.select()
			.from(magicLinks)
			.where(and(eq(magicLinks.id, magicLinkId), eq(magicLinks.organization_id, organization_id)))
			.limit(1);

		if (!magicLink) {
			throw ServiceError.notFound("Couldn't find magic link");
		}
		return magicLink;
	}

	async getMagicLinks(organizationId: string): Promise<MagicLink[]> {
		return db.select().from(magicLinks).where(eq(magicLinks.organization_id, organizationId));
	}

	async getMagicInvites(organizationId: string): Promise<MagicInvite[]> {
		const invites = (await db
			.select()
			.from(magicLinks)
			.where(
				and(eq(magicLinks.organization_id, organizationId), eq(magicLinks.type, 'invite'))
			)) as MagicInvite[];
		return invites;
	}

	async deleteMagicLink(magicLinkId: string, organization_id: string) {
		await this.getMagicLink(magicLinkId, organization_id);
		await db.delete(magicLinks).where(eq(magicLinks.id, magicLinkId));

		return { success: true };
	}

	private async hashToken(raw: string) {
		return encodeHexLowerCase(sha256(new TextEncoder().encode(raw)));
	}

	private generateOTPCode(): string {
		return Array.from({ length: 6 }, () => randomInt(0, 10)).join('');
	}

	async getMagicLinkFromToken(token: string, email?: string): Promise<MagicLink | null> {
		const hashed = await this.hashToken(token);

		const conditions = [eq(magicLinks.token_hash, hashed)];
		if (email) {
			conditions.push(eq(magicLinks.email, email));
		}

		const [magicLink] = await db
			.select()
			.from(magicLinks)
			.where(and(...conditions))
			.limit(1);

		if (!magicLink) {
			return null;
		}

		return magicLink;
	}

	/* Note that duration is in hours */
	private getExpiry(duration: number): Date {
		return new Date(Date.now() + duration * 60 * 60 * 1000);
	}

	async createMagicInvite(
		magicInviteData: CreateMagicInvite,
		organization_id: string,
		userId: string
	): Promise<{ magicInvite: MagicInvite; token: string }> {
		if (
			magicInviteData.invitee_organization_id &&
			magicInviteData.invitee_organization_id != organization_id
		) {
			throw ServiceError.forbidden("Can't create invite to another organization");
		}

		// Check if user with this email already exists
		const existingUser = await userService.findAnyUserByEmail(magicInviteData.email);
		if (existingUser) {
			throw ServiceError.conflict('A user with this email already exists');
		}

		// Check that no magic invites have already been send to this user
		const [existingInvite] = await db
			.select()
			.from(magicLinks)
			.where(eq(magicLinks.email, magicInviteData.email))
			.limit(1);
		if (existingInvite) {
			throw ServiceError.conflict('An invitation has already been sent to this email');
		}

		const token = this.generateOTPCode();
		const tokenHash = await this.hashToken(token);
		const [newMagicInvite] = await db
			.insert(magicLinks)
			.values({
				organization_id: organization_id,
				created_by: userId,
				updated_by: userId,
				type: 'invite',
				email: magicInviteData.email,
				expires_at: this.getExpiry(magicInviteData.token_duration_hours),
				invitee_organization_id: magicInviteData.invitee_organization_id,
				token_hash: tokenHash,
				role: magicInviteData.role
			})
			.returning();

		return { magicInvite: newMagicInvite as MagicInvite, token: token };
	}

	async createMagicLogin(
		magicLoginData: CreateMagicLogin
	): Promise<{ magicLogin: MagicLogin; token: string }> {
		// Check if user exists
		const existingUser = await userService.findAnyUserByEmail(magicLoginData.email);
		if (!existingUser) {
			throw ServiceError.notFound('User with that email could not be found');
		}

		const token = this.generateOTPCode();
		const tokenHash = await this.hashToken(token);

		const [magicLogin] = await db
			.insert(magicLinks)
			.values({
				organization_id: existingUser.organization_id,
				type: 'login',
				email: existingUser.email,
				expires_at: this.getExpiry(0.25), // 15 minutes for OTP
				user_id: existingUser.id,
				token_hash: tokenHash
			})
			.returning();

		return { magicLogin: magicLogin as MagicLogin, token: token };
	}

	private isExpired(date: Date) {
		return Date.now() >= date.getTime();
	}

	// use invite link
	async useMagicInvite(token: string): Promise<User> {
		const magicLink = await this.getMagicLinkFromToken(token);

		if (!magicLink) {
			throw ServiceError.notFound("Couldn't find an invitation matching that token. ");
		}

		const magicInvite = magicInviteSchema.parse(magicLink);

		if (this.isExpired(magicInvite.expires_at)) {
			throw ServiceError.forbidden('Invitation expired');
		}

		if (magicInvite.used_at != null) {
			throw ServiceError.forbidden('Invitation already redeemed');
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

	async validateMagicLogin(token: string, email: string): Promise<PublicUser> {
		const magicLink = await this.getMagicLinkFromToken(token, email);

		if (!magicLink) {
			throw ServiceError.notFound("Couldn't find a login matching that token");
		}

		const magicLogin = magicLoginSchema.parse(magicLink);

		if (this.isExpired(magicLogin.expires_at)) {
			throw ServiceError.forbidden('Login token expired');
		}

		const user = await userService.getPublicUser(magicLogin.user_id, magicLogin.organization_id);

		return user;
	}

	async setMailRecordId(magicLinkId: string, mailRecordId: string): Promise<void> {
		await db
			.update(magicLinks)
			.set({ mail_record_id: mailRecordId })
			.where(eq(magicLinks.id, magicLinkId));
	}
}

export const magicLinkService = new MagicLinkService();
