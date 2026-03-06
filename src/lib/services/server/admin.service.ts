import type { PublicUser } from '$lib/schemas';
import { db } from '$lib/server/db';
import {
	creditTransactions,
	getOrgPlan,
	organizations,
	users
} from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import { stripeClient } from '$lib/services/external/stripe/client';
import { count, desc, eq, isNotNull, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { createSession, generateSessionToken } from './auth';
import { ServiceError } from './errors';
import { subscriptionService } from './subscription.service';
import {
	organizationService,
	publicUserColumns,
	userService
} from './user.service';

const log = logger.child({ service: 'admin' });

type Organization = typeof organizations.$inferSelect;
type CreditTransaction = typeof creditTransactions.$inferSelect;

type OrganizationWithUserCount = Organization & {
	userCount: number;
};

type OrganizationWithBilling = Organization & {
	plan: 'free' | 'pro';
};

type CreditTransactionWithOrg = CreditTransaction & {
	organizationName: string | null;
};

export class AdminService {
	/**
	 * Get all organizations with user counts.
	 */
	async getAllOrganizations(): Promise<OrganizationWithUserCount[]> {
		const rows = await db
			.select({
				id: organizations.id,
				created_at: organizations.created_at,
				created_by: organizations.created_by,
				updated_at: organizations.updated_at,
				updated_by: organizations.updated_by,
				name: organizations.name,
				stripe_customer_id: organizations.stripe_customer_id,
				stripe_subscription_id: organizations.stripe_subscription_id,
				subscription_status: organizations.subscription_status,
				billing_period_starts_at: organizations.billing_period_starts_at,
				billing_period_ends_at: organizations.billing_period_ends_at,
				cancel_at_period_end: organizations.cancel_at_period_end,
				userCount: count(users.id)
			})
			.from(organizations)
			.leftJoin(users, eq(organizations.id, users.organization_id))
			.groupBy(organizations.id)
			.orderBy(desc(organizations.created_at));

		return rows;
	}

	/**
	 * Get all organizations that have an active subscription (Pro orgs).
	 */
	async getAllProOrganizations(): Promise<OrganizationWithBilling[]> {
		const rows = await db
			.select()
			.from(organizations)
			.where(isNotNull(organizations.stripe_subscription_id))
			.orderBy(desc(organizations.updated_at));

		return rows.map((org) => ({
			...org,
			plan: getOrgPlan(org)
		}));
	}

	/**
	 * Get a single organization by ID with billing details.
	 */
	async getOrganizationDetail(organizationId: string) {
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org) {
			throw ServiceError.notFound('Organization not found');
		}

		const [orgUsers, creditBalance, transactions] = await Promise.all([
			db
				.select({
					id: users.id,
					name: users.name,
					email: users.email,
					role: users.role,
					created_at: users.created_at
				})
				.from(users)
				.where(eq(users.organization_id, organizationId)),
			db
				.select({
					total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)::int`
				})
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, organizationId)),
			db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.organization_id, organizationId))
				.orderBy(desc(creditTransactions.created_at))
				.limit(50)
		]);

		return {
			organization: org,
			plan: getOrgPlan(org),
			users: orgUsers,
			creditBalance: creditBalance[0]?.total ?? 0,
			transactions
		};
	}

	/**
	 * Get subscription comparison between local DB and Stripe.
	 */
	async getSubscriptionWithStripeData(organizationId: string) {
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org || !org.stripe_subscription_id) {
			return null;
		}

		const mismatches: string[] = [];
		let stripeData: {
			subscription: Stripe.Subscription;
			customer: Stripe.Customer | Stripe.DeletedCustomer | null;
		} | null = null;

		try {
			const stripeSubscription = await stripeClient.getSubscription(
				org.stripe_subscription_id
			);

			stripeData = {
				subscription: stripeSubscription,
				customer: null
			};

			// Check for mismatches
			if (stripeSubscription.status !== org.subscription_status) {
				mismatches.push(
					`Status: local=${org.subscription_status}, stripe=${stripeSubscription.status}`
				);
			}

			const stripeItem = stripeSubscription.items.data[0];
			if (stripeItem) {
				const stripePeriodStart = new Date(
					stripeItem.current_period_start * 1000
				);
				const stripePeriodEnd = new Date(stripeItem.current_period_end * 1000);

				if (
					org.billing_period_starts_at &&
					Math.abs(
						stripePeriodStart.getTime() - org.billing_period_starts_at.getTime()
					) > 60000
				) {
					mismatches.push(
						`Period start: local=${org.billing_period_starts_at.toISOString()}, stripe=${stripePeriodStart.toISOString()}`
					);
				}
				if (
					org.billing_period_ends_at &&
					Math.abs(
						stripePeriodEnd.getTime() - org.billing_period_ends_at.getTime()
					) > 60000
				) {
					mismatches.push(
						`Period end: local=${org.billing_period_ends_at.toISOString()}, stripe=${stripePeriodEnd.toISOString()}`
					);
				}
			}
		} catch (error) {
			mismatches.push(
				`Failed to fetch Stripe data: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		return {
			local: {
				subscriptionId: org.stripe_subscription_id,
				status: org.subscription_status,
				plan: getOrgPlan(org),
				periodStart: org.billing_period_starts_at,
				periodEnd: org.billing_period_ends_at,
				cancelAtPeriodEnd: org.cancel_at_period_end
			},
			stripe: stripeData,
			mismatches
		};
	}

	/**
	 * Get recent credit transactions across all organizations.
	 */
	async getAllCreditTransactions(
		limit: number = 100
	): Promise<CreditTransactionWithOrg[]> {
		return db
			.select({
				id: creditTransactions.id,
				organization_id: creditTransactions.organization_id,
				created_at: creditTransactions.created_at,
				type: creditTransactions.type,
				amount: creditTransactions.amount,
				expires_at: creditTransactions.expires_at,
				description: creditTransactions.description,
				stripe_payment_intent_id: creditTransactions.stripe_payment_intent_id,
				stripe_invoice_id: creditTransactions.stripe_invoice_id,
				optimization_job_id: creditTransactions.optimization_job_id,
				organizationName: organizations.name
			})
			.from(creditTransactions)
			.leftJoin(
				organizations,
				eq(creditTransactions.organization_id, organizations.id)
			)
			.orderBy(desc(creditTransactions.created_at))
			.limit(limit);
	}

	/**
	 * Force sync subscription from Stripe.
	 */
	async syncSubscriptionFromStripe(organizationId: string): Promise<void> {
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org?.stripe_subscription_id) {
			throw ServiceError.notFound('Organization has no subscription');
		}

		const stripeSubscription = await stripeClient.getSubscription(
			org.stripe_subscription_id
		);

		await subscriptionService.syncSubscription(stripeSubscription);
	}

	/**
	 * Adjust credits for an organization (refunds, goodwill, corrections).
	 */
	async adjustCredits(
		organizationId: string,
		amount: number,
		type: 'adjustment' | 'refund',
		description: string
	): Promise<void> {
		// Verify organization exists
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org) {
			throw ServiceError.notFound('Organization not found');
		}

		await db.insert(creditTransactions).values({
			organization_id: organizationId,
			type,
			amount,
			expires_at: null,
			description
		});
	}

	/**
	 * Get dashboard statistics.
	 */
	async getDashboardStats() {
		const [orgCount, proCount, recentTransactions] = await Promise.all([
			db.select({ count: count() }).from(organizations),
			db
				.select({ count: count() })
				.from(organizations)
				.where(eq(organizations.subscription_status, 'active')),
			this.getAllCreditTransactions(10)
		]);

		return {
			totalOrganizations: orgCount[0]?.count ?? 0,
			proOrganizations: proCount[0]?.count ?? 0,
			recentTransactions
		};
	}

	/**
	 * Create a test account with organization and user.
	 * Starts on Free plan (no Stripe interaction).
	 */
	async createTestAccount(params: {
		email: string;
		name?: string;
		organizationName?: string;
	}): Promise<{
		organization: Organization;
		user: PublicUser;
	}> {
		// Check if email is already in use
		const existingUser = await userService.findAnyUserByEmail(params.email);
		if (existingUser) {
			throw ServiceError.conflict('Email already in use');
		}

		// Create user with admin role (auto-creates org on Free tier)
		const user = await userService.createUser({
			email: params.email,
			name: params.name ?? null,
			role: 'admin'
		});

		// Update organization name if provided, otherwise fetch the created one
		const organization = params.organizationName
			? await organizationService.updateOrganization(
					user.organization_id,
					{ name: params.organizationName },
					user.id
				)
			: await organizationService.getOrganization(user.organization_id);

		log.info(
			{ userId: user.id, organizationId: organization.id },
			'Test account created'
		);

		return {
			organization,
			user: userService.toPublicUser(user)
		};
	}

	/**
	 * Delete an organization and all related data.
	 * Cancels Stripe subscription first if active.
	 */
	async deleteOrganization(organizationId: string): Promise<{ success: true }> {
		const [org] = await db
			.select()
			.from(organizations)
			.where(eq(organizations.id, organizationId))
			.limit(1);

		if (!org) {
			throw ServiceError.notFound('Organization not found');
		}

		if (org.stripe_subscription_id) {
			try {
				await stripeClient.cancelSubscription(org.stripe_subscription_id);
			} catch {
				// If Stripe cancellation fails, still proceed with deletion
			}
		}

		await db.delete(organizations).where(eq(organizations.id, organizationId));

		log.info(
			{ organizationId, organizationName: org.name },
			'Organization deleted'
		);

		return { success: true };
	}

	/**
	 * Create an impersonation session for a target user.
	 */
	async createImpersonationSession(
		targetUserId: string,
		adminUserId: string
	): Promise<{ sessionToken: string; expiresAt: Date }> {
		// Verify target user exists
		const [targetUser] = await db
			.select(publicUserColumns)
			.from(users)
			.where(eq(users.id, targetUserId))
			.limit(1);

		if (!targetUser) {
			throw ServiceError.notFound('User not found');
		}

		// Prevent impersonating self
		if (targetUserId === adminUserId) {
			throw ServiceError.badRequest('Cannot impersonate yourself');
		}

		// Generate session token and create session
		const sessionToken = generateSessionToken();
		const session = await createSession(sessionToken, targetUserId);

		log.info(
			{
				adminUserId,
				targetUserId,
				targetEmail: targetUser.email,
				sessionId: session.id
			},
			'Admin started impersonation'
		);

		return {
			sessionToken,
			expiresAt: session.expires_at
		};
	}
}

export const adminService = new AdminService();
