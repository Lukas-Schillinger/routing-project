import { handleApiError } from '$lib/errors';
import { db } from '$lib/server/db';
import { plans, subscriptions } from '$lib/server/db/schema';
import { requireAdminApi } from '$lib/services/server/admin';
import { ServiceError } from '$lib/services/server/errors';
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

		// Update the subscription's plan
		const [updated] = await db
			.update(subscriptions)
			.set({
				plan_id: data.planId,
				updated_at: new Date()
			})
			.where(eq(subscriptions.organization_id, data.organizationId))
			.returning();

		if (!updated) {
			throw ServiceError.notFound('Subscription not found');
		}

		return json({ success: true, plan });
	} catch (err) {
		handleApiError(err, 'Failed to set plan');
	}
};
