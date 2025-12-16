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
import { z } from 'zod';
import { mapboxDistanceMatrix, mapboxNavigation } from '../external/mapbox';
import type { CoordinatesData } from '../external/mapbox/distance-matrix';
import type { Coordinate } from '../external/mapbox/types';
import { depotService } from './depot.service';
import { ServiceError } from './errors';
import { routeService } from './route.service';

export const optimizationConfigSchema = z.object({
	fairness: z.enum(['high', 'medium', 'low']).default('medium'),
	time_limit_sec: z.number().int().positive().default(10),
	start_at_depot: z.boolean().default(true),
	end_at_depot: z.boolean().default(false)
});

export const matrixPayloadSchema = z.object({
	matrix: z.array(z.array(z.number())),
	stop_ids: z.array(z.string()),
	vehicle_ids: z.array(z.string()),
	config: optimizationConfigSchema
});

export const legSchema = z.object({
	stop_id: z.string(),
	stop_index: z.number().int()
});

export const routeSchema = z.object({
	driver_id: z.string(),
	cost: z.number().int(),
	legs: z.array(legSchema)
});

export const optimizationResultSchema = z.object({
	routes: z.array(routeSchema),
	total_cost: z.number().int().nullable()
});

export const optimizationResponseSchema = z.object({
	success: z.boolean(),
	job_id: z.string().uuid(),
	error_message: z.string().optional(),
	result: optimizationResultSchema.optional()
});

export type OptimizationConfig = z.infer<typeof optimizationConfigSchema>;
export type MatrixPayload = z.infer<typeof matrixPayloadSchema>;
export type Leg = z.infer<typeof legSchema>;
export type Route = z.infer<typeof routeSchema>;
export type OptimizationResult = z.infer<typeof optimizationResultSchema>;
export type OptimizationResponse = z.infer<typeof optimizationResponseSchema>;

/**
 * Optimization Service
 * Handles route optimization using TSP Solver via SQS queue
 * Manages database operations and external API integration
 */
export class OptimizationService {
	private sqsClient: SQSClient;
	private queueUrl: string;
	private readonly DEFAULT_CONFIG = {
		time_limit_sec: 30,
		start_at_depot: true,
		end_at_depot: true
	} as const;

	constructor() {
		this.sqsClient = new SQSClient({
			region: env.AWS_REGION || '',
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID || '',
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
			}
		});
		this.queueUrl = env.OPTIMIZATION_QUEUE_URL;
	}

	async getActiveJobForMap(mapId: string, organizationId: string) {
		const [job] = await db
			.select()
			.from(optimizationJobs)
			.where(
				and(
					eq(optimizationJobs.map_id, mapId),
					eq(optimizationJobs.organization_id, organizationId),
					inArray(optimizationJobs.status, ['pending', 'running', 'completing'])
				)
			)
			.orderBy(optimizationJobs.created_at)
			.limit(1);

		return job ?? null;
	}

	async queueOptimization(mapId: string, organizationId: string, options: OptimizationOptions) {
		const assignedDrivers = await this.fetchAssignedDrivers(mapId, organizationId);

		if (assignedDrivers.length === 0) {
			throw ServiceError.validation(
				'No active drivers assigned to this map. Assign at least one driver before optimizing.'
			);
		}

		const { coordinatesData } = await this.getCoordinatesData(
			mapId,
			options.depotId,
			organizationId
		);

		const matrixResult = await this.getOrCreateDistanceMatrix(
			organizationId,
			mapId,
			coordinatesData
		);

		const vehicleIds = assignedDrivers.map((d) => d.driver.id);

		const [job] = await db
			.insert(optimizationJobs)
			.values({
				organization_id: organizationId,
				status: 'pending',
				matrix_id: matrixResult.id,
				map_id: mapId,
				depot_id: options.depotId
			})
			.returning();

		const payload = {
			job_id: job.id,
			matrix: matrixResult.matrix,
			stop_ids: coordinatesData.locationIds,
			vehicle_ids: vehicleIds,
			config: {
				...this.DEFAULT_CONFIG,
				fairness: options.fairness
			}
		};

		try {
			await this.sqsClient.send(
				new SendMessageCommand({
					QueueUrl: this.queueUrl,
					MessageBody: JSON.stringify(payload)
				})
			);
		} catch (error) {
			console.error('Failed to send message to SQS:', error);
			await this.updateJobStatus(job.id, 'failed', 'Failed to queue optimization job');
			throw ServiceError.internal('Failed to queue optimization job');
		}

		return job;
	}

	async completeOptimization(response: OptimizationResponse) {
		try {
			const [job] = await db
				.select()
				.from(optimizationJobs)
				.where(eq(optimizationJobs.id, response.job_id))
				.limit(1);

			if (!job) {
				throw ServiceError.validation(`Optimization job ${response.job_id} not found`);
			}

			if (job.status === 'cancelled') {
				console.log(`Optimization job ${response.job_id} was cancelled, skipping completion`);
				return;
			}

			const { map_id: mapId, organization_id: organizationId, depot_id: depotId } = job;

			await this.updateJobStatus(response.job_id, 'completing');

			if (!response.success) {
				await this.updateJobStatus(
					response.job_id,
					'failed',
					response.error_message ? response.error_message : 'No error message'
				);
				throw ServiceError.internal('Optimization failed');
			}

			if (!response.result) {
				await this.updateJobStatus(
					response.job_id,
					'failed',
					'Job reported success with empty result'
				);
				throw ServiceError.internal('Optimization failed');
			}

			const { depotCoord, locationCoordMap } = await this.getCoordinatesData(
				mapId,
				depotId,
				organizationId
			);

			await this.clearStopAssignments(mapId);
			await this.applyOptimizedRoutes(mapId, response.result);
			await this.computeAndSaveRoutes(
				mapId,
				organizationId,
				depotId,
				response.result,
				depotCoord,
				locationCoordMap
			);

			await this.updateJobStatus(response.job_id, 'completed');
		} catch (error) {
			console.error('Error completing optimization:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			await this.updateJobStatus(response.job_id, 'failed', errorMessage);
			throw error;
		}
	}

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

	private async applyOptimizedRoutes(
		mapId: string,
		optimizationResult: OptimizationResult
	): Promise<void> {
		const allLocationIds = optimizationResult.routes.flatMap((route) =>
			route.legs.map((leg) => leg.stop_id)
		);

		if (allLocationIds.length === 0) return;

		const matchingStops = await db
			.select({ id: stops.id, location_id: stops.location_id })
			.from(stops)
			.where(and(eq(stops.map_id, mapId), inArray(stops.location_id, allLocationIds)));

		const locationToStopId = new Map(matchingStops.map((s) => [s.location_id, s.id]));

		const updates = optimizationResult.routes
			.flatMap((route) =>
				route.legs.map((leg, i) => ({
					stopId: locationToStopId.get(leg.stop_id),
					driverId: route.driver_id,
					deliveryIndex: i
				}))
			)
			.filter((update) => update.stopId);

		const now = new Date();
		await db.transaction(async (tx) => {
			await Promise.all(
				updates.map((update) =>
					tx
						.update(stops)
						.set({
							driver_id: update.driverId,
							delivery_index: update.deliveryIndex,
							updated_at: now
						})
						.where(eq(stops.id, update.stopId!))
				)
			);
		});
	}

	private async computeAndSaveRoutes(
		mapId: string,
		organizationId: string,
		depotId: string,
		result: OptimizationResult,
		depotCoord: Coordinate,
		locationCoordMap: Map<string, Coordinate>
	): Promise<void> {
		const routePromises = result.routes.map(async (route) => {
			try {
				if (route.legs.length === 0) {
					console.warn(`No stops found for driver ${route.driver_id}`);
					return null;
				}

				const directions = await mapboxNavigation.getDirections([
					depotCoord,
					...route.legs.map((leg) => locationCoordMap.get(leg.stop_id)!),
					depotCoord
				]);

				if (directions.routes.length === 0) {
					console.warn(`No route found for driver ${route.driver_id}`);
					return null;
				}

				const { geometry, duration } = directions.routes[0];

				await routeService.upsertRoute({
					organization_id: organizationId,
					map_id: mapId,
					driver_id: route.driver_id,
					depot_id: depotId,
					geometry,
					duration
				});

				return { driver_id: route.driver_id, success: true };
			} catch (error) {
				console.error(`Error computing route for driver ${route.driver_id}:`, error);
				return { driver_id: route.driver_id, success: false, error };
			}
		});

		const results = await Promise.all(routePromises);
		const failures = results.filter((r) => r && !r.success);
		if (failures.length > 0) {
			console.warn(`Failed to compute ${failures.length} route(s)`);
		}
	}

	async cancelOptimization(mapId: string, organizationId: string) {
		const job = await this.getActiveJobForMap(mapId, organizationId);

		if (!job) {
			throw ServiceError.validation('No active optimization job found for this map');
		}

		await this.updateJobStatus(job.id, 'cancelled');
		return { success: true };
	}

	private async updateJobStatus(
		jobId: string,
		status: 'pending' | 'completing' | 'completed' | 'failed' | 'cancelled',
		errorMessage?: string
	): Promise<void> {
		await db
			.update(optimizationJobs)
			.set({
				status,
				...(errorMessage && { error_message: errorMessage }),
				updated_at: new Date()
			})
			.where(eq(optimizationJobs.id, jobId));
	}

	private toCoordinate(lon: string | number, lat: string | number): Coordinate {
		return [Number(lon), Number(lat)];
	}

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

	private async fetchAssignedDrivers(mapId: string, organizationId: string) {
		return await db
			.select({ driver: drivers })
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

	private async getCoordinatesData(
		mapId: string,
		depotId: string,
		organizationId: string
	): Promise<{
		coordinatesData: CoordinatesData;
		depotCoord: Coordinate;
		locationCoordMap: Map<string, Coordinate>;
	}> {
		const depot = await depotService.getDepotById(depotId, organizationId);

		if (!depot.location.lon || !depot.location.lat) {
			throw ServiceError.validation('Depot location missing coordinates');
		}

		const depotCoord = this.toCoordinate(depot.location.lon, depot.location.lat);

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

		mapStops.sort((a, b) =>
			(a.location.address_hash ?? '').localeCompare(b.location.address_hash ?? '')
		);

		const coordinates: [number, number][] = [depotCoord];
		const locationIds: string[] = [depot.location.id];
		const locationCoordMap = new Map<string, Coordinate>();
		locationCoordMap.set(depot.location.id, depotCoord);

		for (const { location } of mapStops) {
			const coord = this.toCoordinate(location.lon, location.lat);
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

	private createInputHash(coordinatesData: { coordinates: [number, number][] }): string {
		const coordsString = coordinatesData.coordinates
			.map((coord) => `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`)
			.join('|');
		return createHash('sha256').update(coordsString).digest('hex');
	}
}

export const optimizationService = new OptimizationService();
