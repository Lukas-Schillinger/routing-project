import type { CreateLoginToken, LoginToken, PublicUser } from '$lib/schemas';
import { db } from '$lib/server/db';
import { loginTokens } from '$lib/server/db/schema';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeHexLowerCase } from '@oslojs/encoding';
import { randomInt } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';
import { userService } from './user.service';

const LOGIN_TOKEN_DURATION_HOURS = 0.25; // 15 minutes

export class LoginTokenService {
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

	async getLoginTokenFromToken(token: string, email: string): Promise<LoginToken | null> {
		const hashed = await this.hashToken(token);

		// First find user by email to get their ID
		const user = await userService.findAnyUserByEmail(email);
		if (!user) {
			return null;
		}

		const [loginToken] = await db
			.select()
			.from(loginTokens)
			.where(and(eq(loginTokens.token_hash, hashed), eq(loginTokens.user_id, user.id)))
			.limit(1);

		if (!loginToken) {
			return null;
		}

		return loginToken;
	}

	async createLoginToken(
		loginTokenData: CreateLoginToken
	): Promise<{ loginToken: LoginToken; token: string }> {
		// Check if user exists
		const existingUser = await userService.findAnyUserByEmail(loginTokenData.email);
		if (!existingUser) {
			throw ServiceError.notFound('User with that email could not be found');
		}

		const token = this.generateOTPCode();
		const tokenHash = await this.hashToken(token);

		const [loginToken] = await db
			.insert(loginTokens)
			.values({
				organization_id: existingUser.organization_id,
				user_id: existingUser.id,
				token_hash: tokenHash,
				expires_at: this.getExpiry(LOGIN_TOKEN_DURATION_HOURS)
			})
			.returning();

		return { loginToken: loginToken, token: token };
	}

	async validateLoginToken(token: string, email: string): Promise<PublicUser> {
		const loginToken = await this.getLoginTokenFromToken(token, email);

		if (!loginToken) {
			throw ServiceError.notFound("Couldn't find a login matching that token");
		}

		if (this.isExpired(loginToken.expires_at)) {
			throw ServiceError.forbidden('Login token expired');
		}

		const user = await userService.getPublicUser(loginToken.user_id, loginToken.organization_id);

		return user;
	}

	async setMailRecordId(loginTokenId: string, mailRecordId: string): Promise<void> {
		await db
			.update(loginTokens)
			.set({ mail_record_id: mailRecordId })
			.where(eq(loginTokens.id, loginTokenId));
	}
}

export const loginTokenService = new LoginTokenService();
