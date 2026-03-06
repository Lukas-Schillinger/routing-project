// GET /api/maps/[mapId]/optimize - Get current optimization job status
// POST /api/maps/[mapId]/optimize - Optimize routes for a map using TSP solver

import { handleApiError, ServiceError } from '$lib/errors';
import { optimizationOptionsSchema } from '$lib/schemas/map';
import { billingService } from '$lib/services/server/billing.service';
import { optimizationService } from '$lib/services/server/optimization.service';
import { requirePermissionApi } from '$lib/services/server/permissions';
import { stopService } from '$lib/services/server/stop.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const user = requirePermissionApi('resources:read');
	const { mapId } = params;

	try {
		const job = await optimizationService.getActiveJobForMap(
			mapId,
			user.organization_id
		);
		return json(job);
	} catch (err) {
		handleApiError(err, 'Failed to get optimization status');
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requirePermissionApi('resources:create');
	const { mapId } = params;
	const log = locals.log;

	try {
		const body = await request.json();
		const options = optimizationOptionsSchema.parse(body);

		// Check credit balance covers the number of stops being optimized.
		// Credits are debited on successful completion (not on queue) to avoid
		// refund logic for failures, cancellations, and timeouts.
		const stopCount = await stopService.getStopCountForMap(
			mapId,
			user.organization_id
		);
		const availableCredits = await billingService.getAvailableCredits(
			user.organization_id
		);
		if (availableCredits < stopCount) {
			throw ServiceError.forbidden(
				'Insufficient credits. Please purchase more credits to continue optimizing routes.'
			);
		}

		log.info({ mapId }, 'Starting optimization request');

		const result = await optimizationService.queueOptimization(
			mapId,
			user.organization_id,
			user.id,
			options,
			locals.requestId
		);

		log.info({ mapId, jobId: result.id }, 'Optimization job queued');
		return json(result);
	} catch (err) {
		handleApiError(err, 'Failed to optimize routes');
	}
};
