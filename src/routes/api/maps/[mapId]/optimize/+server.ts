// POST /api/maps/[mapId]/optimize - Optimize routes for a map

import { db } from '$lib/server/db';
import { maps } from '$lib/server/db/schema';
import type { OptimizationOptions } from '$lib/services/geoapify-optimization';
import { GeoApifyOptimizationService } from '$lib/services/geoapify-optimization';
import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = locals.user;
	if (!user) {
		error(401, 'Unauthorized');
	}

	const { mapId } = params;

	try {
		// Verify map belongs to user's organization
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, user.organization_id)))
			.limit(1);

		if (!map) {
			error(404, 'Map not found');
		}

		// Parse optimization options from request body
		const body = await request.json();
		const options: OptimizationOptions = {
			mode: body.mode || 'drive',
			traffic: body.traffic || 'approximated',
			optimize: body.optimize || 'time',
			depot: {
				location: [-81.95501, 28.04568],
				endBehavior: 'last-stop'
			},
			driverConfig: body.driverConfig,
			globalDriverConfig: body.globalDriverConfig,
			stopConfig: body.stopConfig,
			globalStopConfig: body.globalStopConfig
		};

		// Run optimization - updates stops table with driver_id and delivery_index
		const optimizationService = new GeoApifyOptimizationService();
		const optimizedStops = await optimizationService.optimizeWithDrivers(mapId, options);

		return json({
			success: true,
			optimizedStops
		});
	} catch (err) {
		console.error('Error optimizing routes:', err);

		// Log the full error for debugging
		if (err instanceof Error) {
			console.error('Error name:', err.name);
			console.error('Error message:', err.message);
			console.error('Error stack:', err.stack);
		}

		// Provide more specific error messages
		if (err instanceof Error) {
			if (err.message.includes('not found')) {
				error(404, err.message);
			}
			if (err.message.includes('must be created')) {
				error(400, err.message);
			}
			error(500, `Optimization failed: ${err.message}`);
		}

		error(500, 'Failed to optimize routes');
	}
};
