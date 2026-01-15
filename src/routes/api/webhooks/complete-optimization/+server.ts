import { env } from '$env/dynamic/private';
import { handleWebhookError, ServiceError } from '$lib/errors';
import {
	optimizationResponseSchema,
	optimizationService
} from '$lib/services/server/optimization.service';
import { json } from '@sveltejs/kit';
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

		if (authHeader !== `Bearer ${expectedToken}`) {
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
		await optimizationService.completeOptimization(validatedData);

		log.info({ jobId }, 'Optimization webhook processed');
		return json({ success: true });
	} catch (error) {
		const { body, status } = handleWebhookError(
			error,
			'complete-optimization',
			{ jobId }
		);
		return json(body, { status });
	}
};
