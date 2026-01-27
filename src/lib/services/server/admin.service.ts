import { db } from '$lib/server/db';
import {
	creditTransactions,
	organizations,
	plans,
	subscriptions,
	users,
	type Plan
} from '$lib/server/db/schema';
import { stripeClient } from '$lib/services/external/stripe/client';
import { count, desc, eq, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { ServiceError } from './errors';
import { subscriptionService } from './subscription.service';

type Subscription = typeof subscriptions.$inferSelect;
type Organization = typeof organizations.$inferSelect;
type CreditTransaction = typeof creditTransactions.$inferSelect;

type OrganizationWithUserCount = Organization & {
	userCount: number;
};

type SubscriptionWithOrgAndPlan = {
	subscription: Subscription;
	organization: Organization;
	plan: Plan;
};

type SubscriptionComparison = {
	local: {
		subscription: Subscription;
		plan: Plan;
	};
	stripe: {
		subscription: Stripe.Subscription;
		customer: Stripe.Customer | Stripe.DeletedCustomer | null;
	} | null;
	mismatches: string[];
};

type CreditTransactionWithOrg = CreditTransaction & {
	organizationName: string | null;
};

export class AdminService {
	/**
	 * Get all organizations with user counts.
	 */
	async getAllOrganizations(): Promise<OrganizationWithUserCount[]> {
		return db
			.select({
				id: organizations.id,
				created_at: organizations.created_at,
				created_by: organizations.created_by,
				updated_at: organizations.updated_at,
				updated_by: organizations.updated_by,
				name: organizations.name,
				userCount: count(users.id)
			})
			.from(organizations)
			.leftJoin(users, eq(organizations.id, users.organization_id))
			.groupBy(organizations.id)
			.orderBy(desc(organizations.created_at));
	}

	/**
	 * Get all subscriptions with organization and plan details.
	 */
	async getAllSubscriptions(): Promise<SubscriptionWithOrgAndPlan[]> {
		return db
			.select({
				subscription: subscriptions,
				organization: organizations,
				plan: plans
			})
			.from(subscriptions)
			.innerJoin(
				organizations,
				eq(subscriptions.organization_id, organizations.id)
			)
			.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
			.orderBy(desc(subscriptions.created_at));
	}

	/**
	 * Get all plans.
	 */
	async getAllPlans(): Promise<Plan[]> {
		return db.select().from(plans).orderBy(plans.name);
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

		const [orgUsers, subscription, creditBalance, transactions] =
			await Promise.all([
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
						subscription: subscriptions,
						plan: plans
					})
					.from(subscriptions)
					.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
					.where(eq(subscriptions.organization_id, organizationId))
					.limit(1),
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
			users: orgUsers,
			subscription: subscription[0] ?? null,
			creditBalance: creditBalance[0]?.total ?? 0,
			transactions
		};
	}

	/**
	 * Get subscription comparison between local DB and Stripe.
	 */
	async getSubscriptionWithStripeData(
		organizationId: string
	): Promise<SubscriptionComparison> {
		// Get local subscription
		const [localData] = await db
			.select({
				subscription: subscriptions,
				plan: plans
			})
			.from(subscriptions)
			.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
			.where(eq(subscriptions.organization_id, organizationId))
			.limit(1);

		if (!localData) {
			throw ServiceError.notFound('Subscription not found');
		}

		const mismatches: string[] = [];
		let stripeData: SubscriptionComparison['stripe'] = null;

		try {
			const [stripeSubscription, stripeCustomer] = await Promise.all([
				stripeClient.getSubscription(
					localData.subscription.stripe_subscription_id
				),
				stripeClient.getCustomer(localData.subscription.stripe_customer_id)
			]);

			stripeData = {
				subscription: stripeSubscription,
				customer: stripeCustomer
			};

			// Check for mismatches
			if (stripeSubscription.status !== localData.subscription.status) {
				mismatches.push(
					`Status: local=${localData.subscription.status}, stripe=${stripeSubscription.status}`
				);
			}

			const stripeItem = stripeSubscription.items.data[0];
			if (stripeItem) {
				const stripePriceId =
					typeof stripeItem.price === 'string'
						? stripeItem.price
						: stripeItem.price.id;
				if (stripePriceId !== localData.plan.stripe_price_id) {
					mismatches.push(
						`Price ID: local=${localData.plan.stripe_price_id}, stripe=${stripePriceId}`
					);
				}

				const stripePeriodStart = new Date(
					stripeItem.current_period_start * 1000
				);
				const stripePeriodEnd = new Date(stripeItem.current_period_end * 1000);
				const localPeriodStart = new Date(
					localData.subscription.period_starts_at
				);
				const localPeriodEnd = new Date(localData.subscription.period_ends_at);

				if (
					Math.abs(stripePeriodStart.getTime() - localPeriodStart.getTime()) >
					60000
				) {
					mismatches.push(
						`Period start: local=${localPeriodStart.toISOString()}, stripe=${stripePeriodStart.toISOString()}`
					);
				}
				if (
					Math.abs(stripePeriodEnd.getTime() - localPeriodEnd.getTime()) > 60000
				) {
					mismatches.push(
						`Period end: local=${localPeriodEnd.toISOString()}, stripe=${stripePeriodEnd.toISOString()}`
					);
				}
			}
		} catch (error) {
			mismatches.push(
				`Failed to fetch Stripe data: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		return {
			local: localData,
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
		const [subscription] = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.organization_id, organizationId))
			.limit(1);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		const stripeSubscription = await stripeClient.getSubscription(
			subscription.stripe_subscription_id
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
	 * Update a plan's monthly credits or features.
	 */
	async updatePlan(
		planId: string,
		data: { monthly_credits?: number; features?: Plan['features'] }
	): Promise<Plan> {
		const [existingPlan] = await db
			.select()
			.from(plans)
			.where(eq(plans.id, planId))
			.limit(1);

		if (!existingPlan) {
			throw ServiceError.notFound('Plan not found');
		}

		const [updatedPlan] = await db
			.update(plans)
			.set({
				monthly_credits: data.monthly_credits ?? existingPlan.monthly_credits,
				features: data.features ?? existingPlan.features,
				updated_at: new Date()
			})
			.where(eq(plans.id, planId))
			.returning();

		return updatedPlan;
	}

	/**
	 * Get dashboard statistics.
	 */
	async getDashboardStats() {
		const [orgCount, subsByPlan, recentTransactions] = await Promise.all([
			db.select({ count: count() }).from(organizations),
			db
				.select({
					planName: plans.name,
					count: count()
				})
				.from(subscriptions)
				.innerJoin(plans, eq(subscriptions.plan_id, plans.id))
				.groupBy(plans.name),
			this.getAllCreditTransactions(10)
		]);

		return {
			totalOrganizations: orgCount[0]?.count ?? 0,
			subscriptionsByPlan: subsByPlan,
			recentTransactions
		};
	}
}

export const adminService = new AdminService();
