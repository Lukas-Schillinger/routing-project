import { env } from '$env/dynamic/private';
import type { OptimizationOptions } from '$lib/schemas/map';
import { db } from '$lib/server/db';
import {
	driverMapMemberships,
	drivers,
	locations,
	matrices,
	optimizationJobs,
	stops
} from '$lib/server/db/schema';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { createHash } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { mapboxDistanceMatrix, mapboxNavigation } from '../external/mapbox';
import type { CoordinatesData, DistanceMatrixResult } from '../external/mapbox/distance-matrix';
import type { Coordinate } from '../external/mapbox/types';
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

		// 2. Get coordinates data (fetches depot once, reused throughout)
		const { coordinatesData, depotCoord, locationCoordMap } = await this.getCoordinatesData(
			mapId,
			options.depotId,
			organizationId
		);

		// 3. Get or create distance matrix (with caching)
		const matrixResult = await this.getOrCreateDistanceMatrix(
			organizationId,
			mapId,
			coordinatesData
		);

		// 4. Extract driver IDs
		const vehicleIds = assignedDrivers.map((d) => d.driver.id);

		// 5. Call TSP solver with internal config defaults
		const result = await tspSolverOptimization.optimize(
			matrixResult.matrix,
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

		// 7. Apply optimized routes to database (batched)
		await this.applyOptimizedRoutes(mapId, result);

		// 8. Compute and save route geometries
		await this.computeAndSaveRoutes(
			mapId,
			organizationId,
			options.depotId,
			result,
			depotCoord,
			locationCoordMap
		);

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
		organizationId: string,
		mapId: string,
		coordinatesData: CoordinatesData
	): Promise<DistanceMatrixResult> {
		const inputHash = this.createInputHash(coordinatesData);

		// Check for existing matrix with same input hash
		const existingMatrix = await db
			.select()
			.from(matrices)
			.where(and(eq(matrices.organization_id, organizationId), eq(matrices.inputsHash, inputHash)))
			.limit(1);

		if (existingMatrix.length > 0) {
			// Return cached matrix
			const cached = existingMatrix[0];
			return {
				matrix: cached.matrix as number[][],
				locationIds: coordinatesData.locationIds
			};
		}

		// Create new matrix via API using pre-fetched coordinates
		const matrixResult = await mapboxDistanceMatrix.createDistanceMatrix(coordinatesData);

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
	private async getCoordinatesData(
		mapId: string,
		depotId: string,
		organizationId: string
	): Promise<{
		coordinatesData: CoordinatesData;
		depotCoord: Coordinate;
		locationCoordMap: Map<string, Coordinate>;
	}> {
		// Fetch depot with location (cached for reuse in computeAndSaveRoutes)
		const depot = await depotService.getDepotById(depotId, organizationId);

		if (!depot.location.lon || !depot.location.lat) {
			throw ServiceError.validation(
				'Depot location has no coordinates. Please update the depot with valid coordinates.'
			);
		}

		const depotCoord: Coordinate = [Number(depot.location.lon), Number(depot.location.lat)];

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
		const coordinates: [number, number][] = [depotCoord];
		const locationIds: string[] = [depot.location.id];

		// Build location → coordinate map for quick lookup in computeAndSaveRoutes
		const locationCoordMap = new Map<string, Coordinate>();
		locationCoordMap.set(depot.location.id, depotCoord);

		// Add all stop coordinates in sorted order
		for (const { location } of mapStops) {
			const coord: Coordinate = [Number(location.lon), Number(location.lat)];
			coordinates.push(coord);
			locationIds.push(location.id);
			locationCoordMap.set(location.id, coord);
		}

		return {
			coordinatesData: { coordinates, locationIds },
			depotCoord,
			locationCoordMap
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
	 * Set driver_id and deliver_index on stops in the map
	 */
	private async applyOptimizedRoutes(
		mapId: string,
		optimizationResult: OptimizationResult
	): Promise<void> {
		// Collect all location_ids from routes to fetch stops in one query
		const allLocationIds = optimizationResult.routes.flatMap((route) =>
			route.legs.map((leg) => leg.stop_id)
		);

		if (allLocationIds.length === 0) return;

		// Fetch all stops for this map that match the location_ids
		const matchingStops = await db
			.select({ id: stops.id, location_id: stops.location_id })
			.from(stops)
			.where(and(eq(stops.map_id, mapId), inArray(stops.location_id, allLocationIds)));

		// Build location_id → stop_id map
		const locationToStopId = new Map(matchingStops.map((s) => [s.location_id, s.id]));

		// Build updates array
		const updates: { stopId: string; driverId: string; deliveryIndex: number }[] = [];

		for (const route of optimizationResult.routes) {
			for (let i = 0; i < route.legs.length; i++) {
				const leg = route.legs[i];
				const stopId = locationToStopId.get(leg.stop_id);
				if (stopId) {
					updates.push({
						stopId,
						driverId: route.driver_id,
						deliveryIndex: i
					});
				}
			}
		}

		// Execute all updates in a transaction
		const now = new Date();
		await db.transaction(async (tx) => {
			for (const update of updates) {
				await tx
					.update(stops)
					.set({
						driver_id: update.driverId,
						delivery_index: update.deliveryIndex,
						updated_at: now
					})
					.where(eq(stops.id, update.stopId));
			}
		});
	}

	/**
	 * Compute route geometries using Mapbox Directions API and save to database
	 * Uses pre-fetched coordinates to avoid re-querying stops
	 */
	private async computeAndSaveRoutes(
		mapId: string,
		organizationId: string,
		depotId: string,
		result: OptimizationResult,
		depotCoord: Coordinate,
		locationCoordMap: Map<string, Coordinate>
	): Promise<void> {
		// Prepare all route computations in parallel
		const routePromises = result.routes.map(async (route) => {
			try {
				if (route.legs.length === 0) {
					console.warn(`No stops found for driver ${route.driver_id}`);
					return null;
				}

				// Build coordinate sequence from cached data: depot → stops → depot
				const coordinates: Coordinate[] = [
					depotCoord,
					...route.legs.map((leg) => locationCoordMap.get(leg.stop_id)!),
					depotCoord
				];

				// Call Mapbox Directions API
				const directions = await mapboxNavigation.getDirections(coordinates);

				if (directions.routes.length === 0) {
					console.warn(`No route found for driver ${route.driver_id}`);
					return null;
				}

				const bestRoute = directions.routes[0];

				// Save route to database
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

export class NewOptimizationService {
	private sqsClient: SQSClient;
	private queueUrl: string;

	constructor() {
		this.sqsClient = new SQSClient({
			region: 'us-east-1',
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID || '',
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
			}
		});
		this.queueUrl = env.OPTIMIZATION_QUEUE_URL;
	}
	/**
	 * Optimize routes for a map
	 *
	 * @param mapId - Map ID to optimize
	 * @param organizationId - Organization ID for access control
	 * @param options - Optimization options (depotId and fairness)
	 * @returns Optimization result
	 */
	async queueOptimization(mapId: string, organizationId: string, options: OptimizationOptions) {
		const assignedDrivers = await this.fetchAssignedDrivers(mapId, organizationId);

		if (assignedDrivers.length === 0) {
			throw ServiceError.validation(
				'No active drivers assigned to this map. Assign at least one driver before optimizing.'
			);
		}

		// 2. Get coordinates data (fetches depot once, reused throughout)
		const { coordinatesData } = await this.getCoordinatesData(
			mapId,
			options.depotId,
			organizationId
		);

		// 3. Get or create distance matrix (with caching)
		const matrixResult = await this.getOrCreateDistanceMatrix(
			organizationId,
			mapId,
			coordinatesData
		);

		// 4. Extract driver IDs
		const vehicleIds = assignedDrivers.map((d) => d.driver.id);

		const job = await db
			.insert(optimizationJobs)
			.values({
				organization_id: organizationId,
				status: 'pending',
				matrix_id: matrixResult.id,
				map_id: mapId
			})
			.returning();

		const payload = {
			matrix: matrixResult.matrix,
			stop_ids: coordinatesData.locationIds,
			vehicle_ids: vehicleIds,
			config: {
				fairness: options.fairness,
				time_limit_sec: 30,
				start_at_depot: true,
				end_at_depot: true
			}
		};

		const command = new SendMessageCommand({
			QueueUrl: this.queueUrl,
			MessageBody: JSON.stringify(payload)
		});

		try {
			await this.sqsClient.send(command);
		} catch (error) {
			console.error('Failed to send message to SQS:', error);
			throw ServiceError.internal('Failed to queue optimization job');
		}

		return job[0];
	}

	async completeOptimization(result: OptimizationResult) {
		// 6. Clear existing driver assignments
		await this.clearStopAssignments(mapId);

		// 7. Apply optimized routes to database (batched)
		await this.applyOptimizedRoutes(mapId, result);

		// 8. Compute and save route geometries
		await this.computeAndSaveRoutes(
			mapId,
			organizationId,
			options.depotId,
			result,
			depotCoord,
			locationCoordMap
		);
	}

	/**
	 * Get or create a distance matrix with caching
	 * Checks for existing matrix with matching input hash before creating new one
	 */
	private async getOrCreateDistanceMatrix(
		organizationId: string,
		mapId: string,
		coordinatesData: CoordinatesData
	) {
		const inputHash = this.createInputHash(coordinatesData);

		// Check for existing matrix with same input hash
		const existingMatrix = await db
			.select()
			.from(matrices)
			.where(and(eq(matrices.organization_id, organizationId), eq(matrices.inputsHash, inputHash)))
			.limit(1);

		if (existingMatrix.length > 0) {
			return existingMatrix[0];
		}

		// Create new matrix via API using pre-fetched coordinates
		const matrixResult = await mapboxDistanceMatrix.createDistanceMatrix(coordinatesData);

		// Save matrix to database
		const matrix = await db
			.insert(matrices)
			.values({
				organization_id: organizationId,
				map_id: mapId,
				inputsHash: inputHash,
				matrix: matrixResult.matrix
			})
			.returning();

		return matrix[0];
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
	 * Get coordinates data for depot and stops
	 */
	private async getCoordinatesData(
		mapId: string,
		depotId: string,
		organizationId: string
	): Promise<{
		coordinatesData: CoordinatesData;
		depotCoord: Coordinate;
		locationCoordMap: Map<string, Coordinate>;
	}> {
		// Fetch depot with location (cached for reuse in computeAndSaveRoutes)
		const depot = await depotService.getDepotById(depotId, organizationId);

		if (!depot.location.lon || !depot.location.lat) {
			throw ServiceError.validation(
				'Depot location has no coordinates. Please update the depot with valid coordinates.'
			);
		}

		const depotCoord: Coordinate = [Number(depot.location.lon), Number(depot.location.lat)];

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
		const coordinates: [number, number][] = [depotCoord];
		const locationIds: string[] = [depot.location.id];

		// Build location → coordinate map for quick lookup in computeAndSaveRoutes
		const locationCoordMap = new Map<string, Coordinate>();
		locationCoordMap.set(depot.location.id, depotCoord);

		// Add all stop coordinates in sorted order
		for (const { location } of mapStops) {
			const coord: Coordinate = [Number(location.lon), Number(location.lat)];
			coordinates.push(coord);
			locationIds.push(location.id);
			locationCoordMap.set(location.id, coord);
		}

		return {
			coordinatesData: { coordinates, locationIds },
			depotCoord,
			locationCoordMap
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
	}
}

export const optimizationService = new OptimizationService();
export const newOptimizationService = new NewOptimizationService();
