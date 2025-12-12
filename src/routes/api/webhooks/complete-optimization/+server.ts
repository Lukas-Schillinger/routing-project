import { optimizationResultSchema } from '$lib/services/external/tsp_solver/types';
import { newOptimizationService } from '$lib/services/server/optimization.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const body = request.JSON();
	const validatedData = optimizationResultSchema.parse(body);
	newOptimizationService.completeOptimization(validatedData);
	return json({ success: true });
};
