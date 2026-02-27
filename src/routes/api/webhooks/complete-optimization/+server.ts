import { env } from '$env/dynamic/private';
import { handleWebhookError, ServiceError } from '$lib/errors';
import { billingService } from '$lib/services/server/billing.service';
import {
	optimizationResponseSchema,
	optimizationService
} from '$lib/services/server/optimization.service';
import { json } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const log = locals.log;
	let jobId: string | undefined;

	try {
		// Verify webhook authentication
		const authHeader = request.headers.get('authorization');
		const expectedToken = env.OPTIMIZATION_WEBHOOK_SECRET;

		if (!expectedToken) {
			throw ServiceError.internal('OPTIMIZATION_WEBHOOK_SECRET not configured');
		}

		const expected = `Bearer ${expectedToken}`;
		const hmac = (s: string) => createHmac('sha256', expected).update(s).digest();
		if (!timingSafeEqual(hmac(authHeader ?? ''), hmac(expected))) {
			throw ServiceError.unauthorized('Invalid webhook authentication');
		}

		// Parse and validate request body
		const body = await request.json();
		const validatedData = optimizationResponseSchema.parse(body);
		jobId = validatedData.job_id;

		log.info(
			{ jobId, success: validatedData.success },
			'Optimization webhook received'
		);

		// Process the optimization result
		const completionResult =
			await optimizationService.completeOptimization(validatedData);

		// Record billing usage for successful optimizations
		// completionResult is null if job was already processed (idempotency)
		if (completionResult !== null) {
			await billingService.recordUsage(
				completionResult.organizationId,
				completionResult.stopCount,
				completionResult.jobId,
				`Route optimization: ${completionResult.stopCount} stops`
			);
			log.info(
				{ jobId, stopCount: completionResult.stopCount },
				'Credit usage recorded'
			);
		}

		log.info({ jobId }, 'Optimization webhook processed');
		return json({ success: true });
	} catch (error) {
		log.error({ error, jobId }, 'Webhook handler error');
		const { body, status } = handleWebhookError(
			error,
			'complete-optimization',
			{ jobId }
		);
		return json(body, { status });
	}
};
