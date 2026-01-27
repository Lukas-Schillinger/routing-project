import { handleApiError } from '$lib/errors';
import { db } from '$lib/server/db';
import { plans, subscriptions } from '$lib/server/db/schema';
import { requireAdminApi } from '$lib/services/server/admin';
import { ServiceError } from '$lib/services/server/errors';
import { stripeClient } from '$lib/services/external/stripe/client';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const setPlanSchema = z.object({
	organizationId: z.string().uuid(),
	planId: z.string().uuid()
});

export const POST: RequestHandler = async ({ request }) => {
	requireAdminApi();

	try {
		const body = await request.json();
		const data = setPlanSchema.parse(body);

		// Verify the plan exists
		const [plan] = await db
			.select()
			.from(plans)
			.where(eq(plans.id, data.planId))
			.limit(1);

		if (!plan) {
			throw ServiceError.notFound('Plan not found');
		}

		// Get the current subscription
		const [subscription] = await db
			.select()
			.from(subscriptions)
			.where(eq(subscriptions.organization_id, data.organizationId))
			.limit(1);

		if (!subscription) {
			throw ServiceError.notFound('Subscription not found');
		}

		// Update Stripe subscription with new price
		const stripeSubscription = await stripeClient.getSubscription(
			subscription.stripe_subscription_id
		);

		const subscriptionItem = stripeSubscription.items.data[0];
		if (!subscriptionItem) {
			throw ServiceError.internal('Stripe subscription has no items');
		}

		// Update the Stripe subscription item with the new price
		const updatedStripeSubscription = await stripeClient.updateSubscription(
			subscription.stripe_subscription_id,
			{
				items: [
					{
						id: subscriptionItem.id,
						price: plan.stripe_price_id
					}
				],
				proration_behavior: 'none' // Admin override - no proration
			}
		);

		// Update local subscription record
		const updatedItem = updatedStripeSubscription.items.data[0];
		await db
			.update(subscriptions)
			.set({
				plan_id: data.planId,
				period_starts_at: updatedItem
					? new Date(updatedItem.current_period_start * 1000)
					: subscription.period_starts_at,
				period_ends_at: updatedItem
					? new Date(updatedItem.current_period_end * 1000)
					: subscription.period_ends_at,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, data.organizationId));

		return json({ success: true, plan });
	} catch (err) {
		handleApiError(err, 'Failed to set plan');
	}
};
