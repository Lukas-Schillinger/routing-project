import type {
	RouteShare,
	RouteShareWithMailRecord,
	RouteWithDetails
} from '$lib/schemas';
import { db } from '$lib/server/db';
import { mailRecords, routeShares, routes } from '$lib/server/db/schema';
import { mailService } from '$lib/services/external/mail';
import { and, eq, isNull } from 'drizzle-orm';
import { ServiceError } from './errors';
import { routeService } from './route.service';
import { TokenUtils } from './token.utils';

const SHARE_DURATION_HOURS = 720; // 30 days

export class RouteShareService {
	/**
	 * Create an email share for a route
	 * Returns the share record and the raw token (to be included in the email link)
	 */
	async createEmailShare(
		routeId: string,
		recipientEmail: string,
		organizationId: string,
		createdBy: string
	): Promise<{ share: RouteShare; token: string }> {
		// Verify the route exists and belongs to the organization
		await routeService.verifyRouteOwnership(routeId, organizationId);

		const token = TokenUtils.generateHex();
		const tokenHash = TokenUtils.hash(token);

		const [share] = await db
			.insert(routeShares)
			.values({
				organization_id: organizationId,
				route_id: routeId,
				created_by: createdBy,
				share_type: 'email',
				access_token_hash: tokenHash,
				expires_at: TokenUtils.getExpiry(SHARE_DURATION_HOURS)
			})
			.returning();

		return { share: share as RouteShare, token };
	}

	/**
	 * Link a mail record to a share (called after sending email)
	 */
	async setMailRecordId(shareId: string, mailRecordId: string): Promise<void> {
		await db
			.update(routeShares)
			.set({ mail_record_id: mailRecordId, updated_at: new Date() })
			.where(eq(routeShares.id, shareId));
	}

	/**
	 * Validate a share token and return the route with details if valid
	 * Returns null if token is invalid, expired, or revoked
	 */
	async validateTokenAndGetRoute(
		token: string
	): Promise<RouteWithDetails | null> {
		const tokenHash = TokenUtils.hash(token);

		const [result] = await db
			.select({ share: routeShares, route: routes })
			.from(routeShares)
			.innerJoin(routes, eq(routeShares.route_id, routes.id))
			.where(
				and(
					eq(routeShares.access_token_hash, tokenHash),
					isNull(routeShares.revoked_at)
				)
			)
			.limit(1);

		if (!result) {
			return null;
		}

		const share = result.share;

		// Check expiration
		if (TokenUtils.isExpired(share.expires_at)) {
			return null;
		}

		// Get full route details
		return routeService.getRouteWithDetails(
			share.route_id,
			share.organization_id
		);
	}

	/**
	 * Get all shares for a route with their mail records
	 */
	async getSharesForRoute(
		routeId: string,
		organizationId: string
	): Promise<RouteShareWithMailRecord[]> {
		// Verify ownership
		await routeService.verifyRouteOwnership(routeId, organizationId);

		const results = await db
			.select({ share: routeShares, mailRecord: mailRecords })
			.from(routeShares)
			.leftJoin(mailRecords, eq(routeShares.mail_record_id, mailRecords.id))
			.where(
				and(
					eq(routeShares.route_id, routeId),
					eq(routeShares.organization_id, organizationId)
				)
			);

		return results.map((r) => ({
			...r.share,
			mailRecord: r.mailRecord
		})) as RouteShareWithMailRecord[];
	}

	/**
	 * Get a single share by ID
	 */
	async getShare(shareId: string, organizationId: string): Promise<RouteShare> {
		const [share] = await db
			.select()
			.from(routeShares)
			.where(
				and(
					eq(routeShares.id, shareId),
					eq(routeShares.organization_id, organizationId)
				)
			)
			.limit(1);

		if (!share) {
			throw ServiceError.notFound('Share not found');
		}

		return share as RouteShare;
	}

	/**
	 * Revoke a share
	 */
	async revokeShare(shareId: string, organizationId: string): Promise<void> {
		const share = await this.getShare(shareId, organizationId);

		if (share.revoked_at) {
			throw ServiceError.badRequest('Share is already revoked');
		}

		await db
			.update(routeShares)
			.set({ revoked_at: new Date(), updated_at: new Date() })
			.where(eq(routeShares.id, shareId));
	}

	/**
	 * Resend a share email (creates new share, revokes old one)
	 * Returns the new share with mail record
	 */
	async resendEmailShare(
		shareId: string,
		organizationId: string,
		createdBy: string,
		origin: string
	): Promise<RouteShareWithMailRecord> {
		// Get the existing share with mail record to get the email
		const shares = await this.getSharesForRoute(
			(await this.getShare(shareId, organizationId)).route_id,
			organizationId
		);
		const existingShare = shares.find((s) => s.id === shareId);

		if (!existingShare?.mailRecord?.to_email) {
			throw ServiceError.badRequest(
				'Cannot resend: no email address on original share'
			);
		}

		const recipientEmail = existingShare.mailRecord.to_email;
		const routeId = existingShare.route_id;

		// Revoke the old share
		if (!existingShare.revoked_at) {
			await this.revokeShare(shareId, organizationId);
		}

		// Create and send new share
		return this.createAndSendEmailShare(
			routeId,
			recipientEmail,
			organizationId,
			createdBy,
			origin
		);
	}

	/**
	 * Delete a share entirely
	 */
	async deleteShare(shareId: string, organizationId: string): Promise<void> {
		await this.getShare(shareId, organizationId); // Verify existence

		await db.delete(routeShares).where(eq(routeShares.id, shareId));
	}

	/**
	 * Create an email share and send the notification email
	 * Returns the share with mail record for API response
	 */
	async createAndSendEmailShare(
		routeId: string,
		recipientEmail: string,
		organizationId: string,
		createdBy: string,
		origin: string
	): Promise<RouteShareWithMailRecord> {
		// Create the share
		const { share, token } = await this.createEmailShare(
			routeId,
			recipientEmail,
			organizationId,
			createdBy
		);

		// Get route details for email
		const routeDetails = await routeService.getRouteWithDetails(
			routeId,
			organizationId
		);

		// Send the email
		await mailService.sendRouteShareEmail(
			share,
			recipientEmail,
			token,
			routeDetails.map.title,
			routeDetails.driver.name,
			origin
		);

		// Fetch the share with mail record for response
		const shares = await this.getSharesForRoute(routeId, organizationId);
		const shareWithRecord = shares.find((s) => s.id === share.id);

		if (!shareWithRecord) {
			throw ServiceError.internal('Failed to retrieve created share');
		}

		return shareWithRecord;
	}
}

export const routeShareService = new RouteShareService();
