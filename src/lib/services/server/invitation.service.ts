import type { CreateInvitation, Invitation, MailRecord, PublicUser } from '$lib/schemas';
import { db } from '$lib/server/db';
import { invitations, mailRecords } from '$lib/server/db/schema';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { randomInt } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';
import { userService } from './user.service';

const INVITATION_DURATION_HOURS = 720; // 30 days

export class InvitationService {
	async getInvitation(invitationId: string, organizationId: string): Promise<Invitation> {
		const [invitation] = await db
			.select()
			.from(invitations)
			.where(and(eq(invitations.id, invitationId), eq(invitations.organization_id, organizationId)))
			.limit(1);

		if (!invitation) {
			throw ServiceError.notFound("Couldn't find invitation");
		}
		return invitation;
	}

	async getInvitations(organizationId: string): Promise<Invitation[]> {
		return db.select().from(invitations).where(eq(invitations.organization_id, organizationId));
	}

	async getInvitationsWithMailRecord(
		organizationId: string
	): Promise<{ invitation: Invitation; mailRecord: MailRecord }[]> {
		const results = await db
			.select({ invitation: invitations, mailRecord: mailRecords })
			.from(invitations)
			.innerJoin(mailRecords, eq(invitations.mail_record_id, mailRecords.id))
			.where(eq(invitations.organization_id, organizationId));

		return results as { invitation: Invitation; mailRecord: MailRecord }[];
	}

	async deleteInvitation(invitationId: string, organizationId: string) {
		await this.getInvitation(invitationId, organizationId);
		await db.delete(invitations).where(eq(invitations.id, invitationId));

		return { success: true };
	}

	private async hashToken(raw: string) {
		return encodeHexLowerCase(sha256(new TextEncoder().encode(raw)));
	}

	private generateOTPCode(): string {
		return Array.from({ length: 6 }, () => randomInt(0, 10)).join('');
	}

	/* Note that duration is in hours */
	private getExpiry(duration: number): Date {
		return new Date(Date.now() + duration * 60 * 60 * 1000);
	}

	private isExpired(date: Date) {
		return Date.now() >= date.getTime();
	}

	async getInvitationFromToken(token: string, email: string): Promise<Invitation | null> {
		const hashed = await this.hashToken(token);

		const [invitation] = await db
			.select()
			.from(invitations)
			.where(and(eq(invitations.token_hash, hashed), eq(invitations.email, email)))
			.limit(1);

		if (!invitation) {
			return null;
		}

		return invitation;
	}

	async createInvitation(
		invitationData: CreateInvitation,
		organizationId: string,
		userId: string
	): Promise<{ invitation: Invitation; token: string }> {
		// Check if user with this email already exists
		const existingUser = await userService.findAnyUserByEmail(invitationData.email);
		if (existingUser) {
			throw ServiceError.conflict('A user with this email already exists');
		}

		// Check that no invitations have already been sent to this user
		const [existingInvite] = await db
			.select()
			.from(invitations)
			.where(eq(invitations.email, invitationData.email))
			.limit(1);
		if (existingInvite) {
			throw ServiceError.conflict('An invitation has already been sent to this email');
		}

		const token = this.generateOTPCode();
		const tokenHash = await this.hashToken(token);
		const [newInvitation] = await db
			.insert(invitations)
			.values({
				organization_id: organizationId,
				created_by: userId,
				updated_by: userId,
				email: invitationData.email,
				expires_at: this.getExpiry(INVITATION_DURATION_HOURS),
				token_hash: tokenHash,
				role: invitationData.role
			})
			.returning();

		return { invitation: newInvitation, token: token };
	}

	async redeemInvitation(invitation: Invitation): Promise<PublicUser> {
		if (this.isExpired(invitation.expires_at)) {
			throw ServiceError.forbidden('Invitation expired');
		}

		if (invitation.used_at != null) {
			throw ServiceError.forbidden('Invitation already redeemed');
		}

		// Use transaction to ensure atomicity
		return await db.transaction(async (tx) => {
			// Mark invite as used first to prevent race conditions
			await tx
				.update(invitations)
				.set({ used_at: new Date() })
				.where(eq(invitations.id, invitation.id));

			// Create user in the same organization as the invitation
			const user = await userService.createUser({
				email: invitation.email,
				role: invitation.role,
				organization_id: invitation.organization_id,
				passwordHash: null,
				name: null
			});

			return {
				id: user.id,
				organization_id: user.organization_id,
				email: user.email,
				name: user.name,
				role: user.role,
				created_at: user.created_at,
				updated_at: user.updated_at,
				email_confirmed_at: user.email_confirmed_at
			};
		});
	}

	async setMailRecordId(invitationId: string, mailRecordId: string): Promise<void> {
		await db
			.update(invitations)
			.set({ mail_record_id: mailRecordId })
			.where(eq(invitations.id, invitationId));
	}
}

export const invitationService = new InvitationService();
