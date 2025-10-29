import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, stops } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { mapboxDistanceMatrix } from '../external/mapbox';
import { tspSolverOptimization } from '../external/tsp_solver';
import type { OptimizationConfig, OptimizationResult } from '../external/tsp_solver/types';
import { ServiceError } from './errors';

/**
 * Options for map optimization
 */
export interface OptimizationOptions {
	/** Required depot ID for route start/end location */
	depotId: string;
	/** Optimization configuration */
	config: OptimizationConfig;
}

/**
 * Optimization Service
 * Handles route optimization using TSP Solver
 * Manages database operations and external API integration
 */
export class OptimizationService {
	/**
	 * Optimize routes for a map
	 *
	 * @param mapId - Map ID to optimize
	 * @param organizationId - Organization ID for access control
	 * @param options - Optimization options including depot and config
	 * @returns Optimization result
	 */
	async optimizeMap(
		mapId: string,
		organizationId: string,
		options: OptimizationOptions
	): Promise<OptimizationResult> {
		// 1. Fetch assigned drivers from database
		const assignedDrivers = await this.fetchAssignedDrivers(mapId, organizationId);

		if (assignedDrivers.length === 0) {
			throw ServiceError.validation(
				'No active drivers assigned to this map. Assign at least one driver before optimizing.'
			);
		}

		// 2. Get distance/duration matrix from Mapbox
		const matrixResult = await mapboxDistanceMatrix.createDistanceMatrix(
			mapId,
			options.depotId,
			organizationId
		);

		// 3. Prepare matrix (handle null values for unreachable locations)
		const cleanedMatrix = matrixResult.matrix.map((row) =>
			row.map((value) => (value === null ? 999999 : value))
		);

		// 4. Extract driver IDs
		const vehicleIds = assignedDrivers.map((d) => d.driver.id);

		// 5. Call TSP solver
		const result = await tspSolverOptimization.optimize(
			cleanedMatrix,
			matrixResult.locationIds,
			vehicleIds,
			options.config
		);

		if (!result.success) {
			throw ServiceError.internal('TSP solver optimization failed');
		}

		// 6. Clear existing driver assignments
		await this.clearStopAssignments(mapId);

		// 7. Apply optimized routes to database
		await this.applyOptimizedRoutes(mapId, result);

		return result;
	}

	/**
	 * Reset optimization for a map (clear all driver assignments)
	 */
	async resetOptimization(mapId: string): Promise<void> {
		await this.clearStopAssignments(mapId);
	}

	/**
	 * Check if the TSP solver is available
	 */
	async isAvailable(): Promise<boolean> {
		return await tspSolverOptimization.isAvailable();
	}

	/**
	 * Fetch active drivers assigned to the map
	 */
	private async fetchAssignedDrivers(mapId: string, organizationId: string) {
		return await db
			.select({
				driver: drivers
			})
			.from(driverMapMemberships)
			.innerJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
			.where(
				and(
					eq(driverMapMemberships.map_id, mapId),
					eq(drivers.organization_id, organizationId),
					eq(drivers.active, true)
				)
			);
	}

	/**
	 * Clear driver assignments for all stops in the map
	 */
	private async clearStopAssignments(mapId: string): Promise<void> {
		await db
			.update(stops)
			.set({
				driver_id: null,
				delivery_index: null,
				updated_at: new Date()
			})
			.where(eq(stops.map_id, mapId));
	}

	/**
	 * Apply optimized routes to stops in the database
	 */
	private async applyOptimizedRoutes(mapId: string, result: OptimizationResult): Promise<number> {
		let updatedCount = 0;

		for (const route of result.routes) {
			for (let i = 0; i < route.legs.length; i++) {
				const leg = route.legs[i];

				// Find the stop by location_id
				const [stop] = await db
					.select()
					.from(stops)
					.where(and(eq(stops.map_id, mapId), eq(stops.location_id, leg.stop_id)))
					.limit(1);

				if (stop) {
					await db
						.update(stops)
						.set({
							driver_id: route.driver_id,
							delivery_index: i, // Use sequence order in route
							updated_at: new Date()
						})
						.where(eq(stops.id, stop.id));

					updatedCount++;
				}
			}
		}

		return updatedCount;
	}
}

// Singleton instance
export const optimizationService = new OptimizationService();
