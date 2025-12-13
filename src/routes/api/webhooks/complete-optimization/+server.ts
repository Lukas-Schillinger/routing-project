import { env } from '$env/dynamic/private';
import {
	optimizationResultSchema,
	optimizationService
} from '$lib/services/server/optimization.service';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Verify webhook authentication
		const authHeader = request.headers.get('authorization');
		const expectedToken = env.OPTIMIZATION_WEBHOOK_SECRET;

		if (!expectedToken) {
			console.error('OPTIMIZATION_WEBHOOK_SECRET not configured');
			return json({ success: false, error: 'Server configuration error' }, { status: 500 });
		}

		if (authHeader !== `Bearer ${expectedToken}`) {
			console.warn('Unauthorized webhook attempt');
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Parse and validate request body
		const body = await request.json();
		const validatedData = optimizationResultSchema.parse(body);

		// Process the optimization result
		await optimizationService.completeOptimization(validatedData);

		return json({ success: true });
	} catch (error) {
		console.error('Webhook error:', error);

		// Handle validation errors specifically
		if (error instanceof z.ZodError) {
			return json(
				{
					success: false,
					error: 'Invalid payload',
					details: error.errors
				},
				{ status: 400 }
			);
		}

		// Generic error response
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
