import type { OptimizationOptions } from '$lib/schemas/map';
import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, locations, matrices, stops } from '$lib/server/db/schema';
import { createHash } from 'crypto';
import { and, eq } from 'drizzle-orm';
import { mapboxDistanceMatrix, mapboxNavigation } from '../external/mapbox';
import type { DistanceMatrixResult } from '../external/mapbox/distance-matrix';
import type { Coordinate, MatrixResponse } from '../external/mapbox/types';
import { tspSolverOptimization } from '../external/tsp_solver';
import type { OptimizationResult } from '../external/tsp_solver/types';
import { depotService } from './depot.service';
import { ServiceError } from './errors';
import { routeService } from './route.service';

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
	 * @param options - Optimization options (depotId and fairness)
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

		// 2. Get or create distance matrix (with caching)
		const matrixResult = await this.getOrCreateDistanceMatrix(
			mapId,
			options.depotId,
			organizationId
		);

		// 3. Prepare matrix (handle null values for unreachable locations)
		const cleanedMatrix = matrixResult.matrix.map((row: (number | null)[]) =>
			row.map((value: number | null) => (value === null ? 999999 : value))
		);

		// 4. Extract driver IDs
		const vehicleIds = assignedDrivers.map((d) => d.driver.id);

		// 5. Call TSP solver with internal config defaults
		const result = await tspSolverOptimization.optimize(
			cleanedMatrix,
			matrixResult.locationIds,
			vehicleIds,
			{
				fairness: options.fairness,
				time_limit_sec: 30,
				start_at_depot: true,
				end_at_depot: true
			}
		);

		if (!result.success) {
			throw ServiceError.internal('TSP solver optimization failed');
		}

		// 6. Clear existing driver assignments
		await this.clearStopAssignments(mapId);

		// 7. Apply optimized routes to database
		await this.applyOptimizedRoutes(mapId, result);

		// 8. Compute and save route geometries in parallel
		await this.computeAndSaveRoutes(mapId, organizationId, options.depotId, result);

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
	 * Get or create a distance matrix with caching
	 * Checks for existing matrix with matching input hash before creating new one
	 */
	private async getOrCreateDistanceMatrix(
		mapId: string,
		depotId: string,
		organizationId: string
	): Promise<DistanceMatrixResult> {
		// Get coordinates and create input hash
		const coordinatesData = await this.getCoordinatesData(mapId, depotId, organizationId);
		const inputHash = this.createInputHash(coordinatesData);

		console.log('DO I NEED TO CREATE A MATRIX?');
		// Check for existing matrix with same input hash
		const existingMatrix = await db
			.select()
			.from(matrices)
			.where(and(eq(matrices.organization_id, organizationId), eq(matrices.inputsHash, inputHash)))
			.limit(1);

		if (existingMatrix.length > 0) {
			console.log('----------------------NO');

			// Return cached matrix (create a mock MatrixResponse for compatibility)
			const cached = existingMatrix[0];
			const mockResponse: MatrixResponse = {
				code: 'Ok',
				durations: cached.matrix,
				sources: [],
				destinations: []
			};

			return {
				matrix: cached.matrix as number[][],
				addresses: coordinatesData.addresses,
				locationIds: coordinatesData.locationIds,
				rawResponse: mockResponse
			};
		}
		console.log('----------------------YES');

		// Create new matrix via API
		const matrixResult = await mapboxDistanceMatrix.createDistanceMatrix(
			mapId,
			depotId,
			organizationId
		);

		// Save matrix to database
		await db.insert(matrices).values({
			organization_id: organizationId,
			map_id: mapId,
			inputsHash: inputHash,
			matrix: matrixResult.matrix
		});

		return matrixResult;
	}

	/**
	 * Get coordinates data for depot and stops
	 */
	private async getCoordinatesData(mapId: string, depotId: string, organizationId: string) {
		// Fetch depot with location
		const depot = await depotService.getDepotById(depotId, organizationId);

		if (!depot.location.lon || !depot.location.lat) {
			throw ServiceError.validation(
				'Depot location has no coordinates. Please update the depot with valid coordinates.'
			);
		}

		// Fetch all stops with their locations for this map
		const mapStops = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(eq(stops.map_id, mapId));

		if (mapStops.length === 0) {
			throw ServiceError.validation('No stops found for this map');
		}

		// Sort stops by address_hash for deterministic ordering
		mapStops.sort((a, b) => {
			const hashA = a.location.address_hash || '';
			const hashB = b.location.address_hash || '';
			return hashA.localeCompare(hashB);
		});

		// Build coordinates array with depot first
		const coordinates: [number, number][] = [
			[Number(depot.location.lon), Number(depot.location.lat)]
		];

		const addresses: string[] = [depot.location.address_line_1 || depot.depot.name || 'Depot'];
		const locationIds: string[] = [depot.location.id];

		// Add all stop coordinates in sorted order
		for (const { location } of mapStops) {
			coordinates.push([Number(location.lon), Number(location.lat)]);
			addresses.push(location.address_line_1 || 'Unknown');
			locationIds.push(location.id);
		}

		return {
			coordinates,
			addresses,
			locationIds
		};
	}

	/**
	 * Create a deterministic hash from coordinates
	 */
	private createInputHash(coordinatesData: { coordinates: [number, number][] }): string {
		// Keep coordinates in order - depot first, then stops ordered by address_hash
		// This preserves the matrix index mapping across cache hits
		const coordsString = coordinatesData.coordinates
			.map((coord) => `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`)
			.join('|');
		return createHash('sha256').update(coordsString).digest('hex');
	} /**
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

	/**
	 * Compute route geometries using Mapbox Directions API and save to database
	 * Makes parallel API calls for all driver routes
	 */
	private async computeAndSaveRoutes(
		mapId: string,
		organizationId: string,
		depotId: string,
		result: OptimizationResult
	): Promise<void> {
		// Get depot location
		const depot = await depotService.getDepotById(depotId, organizationId);
		const depotCoord: Coordinate = [depot.location.lon!, depot.location.lat!];

		// Prepare all route computations in parallel
		const routePromises = result.routes.map(async (route) => {
			try {
				// Get stops for this driver in order
				const driverStops = await db
					.select({
						stop: stops,
						location: locations
					})
					.from(stops)
					.innerJoin(locations, eq(stops.location_id, locations.id))
					.where(and(eq(stops.map_id, mapId), eq(stops.driver_id, route.driver_id)))
					.orderBy(stops.delivery_index);

				if (driverStops.length === 0) {
					console.warn(`No stops found for driver ${route.driver_id}`);
					return null;
				}

				// Build coordinate sequence: depot → stops → depot
				const coordinates: Coordinate[] = [
					depotCoord,
					...driverStops.map((s) => [s.location.lon!, s.location.lat!] as Coordinate),
					depotCoord
				];

				// Call Mapbox Directions API
				const directions = await mapboxNavigation.getDirections(coordinates);

				if (directions.routes.length === 0) {
					console.warn(`No route found for driver ${route.driver_id}`);
					return null;
				}

				const bestRoute = directions.routes[0];

				// Save route to database (geometry is always GeoJSON when using mapboxNavigation)
				await routeService.upsertRoute({
					organization_id: organizationId,
					map_id: mapId,
					driver_id: route.driver_id,
					depot_id: depotId,
					geometry: bestRoute.geometry,
					duration: bestRoute.duration
				});

				return {
					driver_id: route.driver_id,
					success: true
				};
			} catch (error) {
				console.error(`Error computing route for driver ${route.driver_id}:`, error);
				return {
					driver_id: route.driver_id,
					success: false,
					error
				};
			}
		});

		// Execute all route computations in parallel
		const results = await Promise.all(routePromises);

		// Log any failures
		const failures = results.filter((r) => r && !r.success);
		if (failures.length > 0) {
			console.warn(`Failed to compute ${failures.length} route(s)`);
		}
	}
}

// Singleton instance
export const optimizationService = new OptimizationService();
