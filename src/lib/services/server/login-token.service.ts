import { TOKEN_EXPIRY } from '$lib/config';
import type { LoginToken, PublicUser } from '$lib/schemas';
import { createLoginTokenSchema } from '$lib/schemas';
import type { z } from 'zod';
import { db } from '$lib/server/db';
import { loginTokens } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';
import { TokenUtils } from './token.utils';
import { userService } from './user.service';

export class LoginTokenService {
	async getLoginTokenFromToken(
		token: string,
		email: string
	): Promise<LoginToken | null> {
		const hashed = TokenUtils.hash(token);

		// First find user by email to get their ID
		const user = await userService.findAnyUserByEmail(email);
		if (!user) {
			return null;
		}

		const [loginToken] = await db
			.select()
			.from(loginTokens)
			.where(
				and(
					eq(loginTokens.token_hash, hashed),
					eq(loginTokens.user_id, user.id)
				)
			)
			.limit(1);

		if (!loginToken) {
			return null;
		}

		return loginToken;
	}

	async createLoginToken(
		loginTokenData: z.input<typeof createLoginTokenSchema>
	): Promise<{ loginToken: LoginToken; token: string }> {
		// Check if user exists
		const existingUser = await userService.findAnyUserByEmail(
			loginTokenData.email
		);
		if (!existingUser) {
			throw ServiceError.notFound('User with that email could not be found');
		}

		const token = TokenUtils.generateOTP();
		const tokenHash = TokenUtils.hash(token);
		const duration =
			loginTokenData.token_duration_hours ?? TOKEN_EXPIRY.OTP_HOURS;

		const [loginToken] = await db
			.insert(loginTokens)
			.values({
				organization_id: existingUser.organization_id,
				user_id: existingUser.id,
				token_hash: tokenHash,
				type: loginTokenData.type ?? 'login_token',
				expires_at: TokenUtils.getExpiry(duration)
			})
			.returning();

		return { loginToken, token };
	}

	async validateLoginToken(token: string, email: string): Promise<PublicUser> {
		const loginToken = await this.getLoginTokenFromToken(token, email);

		if (!loginToken) {
			throw ServiceError.notFound("Couldn't find a login matching that token");
		}

		if (TokenUtils.isExpired(loginToken.expires_at)) {
			throw ServiceError.forbidden('Login token expired');
		}

		const user = await userService.getPublicUser(
			loginToken.user_id,
			loginToken.organization_id
		);

		return user;
	}

	async setMailRecordId(
		loginTokenId: string,
		mailRecordId: string
	): Promise<void> {
		await db
			.update(loginTokens)
			.set({ mail_record_id: mailRecordId })
			.where(eq(loginTokens.id, loginTokenId));
	}

	async deleteLoginToken(tokenId: string): Promise<void> {
		await db.delete(loginTokens).where(eq(loginTokens.id, tokenId));
	}
}

export const loginTokenService = new LoginTokenService();
