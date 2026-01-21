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
import { logger } from '$lib/server/logger';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { createHash } from 'crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { mapboxDistanceMatrix, mapboxNavigation } from '../external/mapbox';
import type { CoordinatesData } from '../external/mapbox/distance-matrix';
import type { Coordinate } from '../external/mapbox/types';
import { billingService } from './billing.service';
import { depotService } from './depot.service';
import { ServiceError } from './errors';
import { routeService } from './route.service';

// ============================================================================
// Validated Types (Parse, Don't Validate)
// ============================================================================

/** Branded type utility - carries proof of validation in the type */
type Brand<T, B extends string> = T & { readonly __brand: B };

/** A coordinate that has been validated (not NaN, within valid ranges) */
type ValidatedCoordinate = Brand<Coordinate, 'ValidatedCoordinate'>;

/** An array guaranteed to have at least one element */
type NonEmptyArray<T> = [T, ...T[]];

/** Type guard to check if array is non-empty */
function isNonEmpty<T>(arr: T[]): arr is NonEmptyArray<T> {
	return arr.length > 0;
}

/** Parse array into NonEmptyArray or throw with context */
function parseNonEmptyOrThrow<T>(arr: T[], context: string): NonEmptyArray<T> {
	if (!isNonEmpty(arr)) {
		throw ServiceError.validation(`Expected non-empty array for ${context}`);
	}
	return arr;
}

/** Parse and validate a coordinate, throwing with context if invalid */
function parseCoordinateOrThrow(
	lon: string | number | null,
	lat: string | number | null,
	context: string
): ValidatedCoordinate {
	if (lon === null || lat === null) {
		throw ServiceError.validation(`Missing coordinates for ${context}`);
	}

	const lonNum = typeof lon === 'string' ? parseFloat(lon) : lon;
	const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;

	if (Number.isNaN(lonNum) || Number.isNaN(latNum)) {
		throw ServiceError.validation(
			`Invalid coordinates for ${context}: lon=${lon}, lat=${lat}`
		);
	}

	// Valid longitude: -180 to 180, latitude: -90 to 90
	if (lonNum < -180 || lonNum > 180 || latNum < -90 || latNum > 90) {
		throw ServiceError.validation(
			`Coordinates out of range for ${context}: lon=${lonNum}, lat=${latNum}`
		);
	}

	return [lonNum, latNum] as ValidatedCoordinate;
}

export const optimizationConfigSchema = z.object({
	fairness: z.enum(['high', 'medium', 'low']).default('medium'),
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

// Discriminated union for optimization response - TypeScript narrows automatically
const successfulResponseSchema = z.object({
	success: z.literal(true),
	job_id: z.uuid(),
	error_message: z.null().optional(),
	result: optimizationResultSchema
});

const failedResponseSchema = z.object({
	success: z.literal(false),
	job_id: z.uuid(),
	error_message: z.string(),
	result: z.null().optional()
});

export const optimizationResponseSchema = z.discriminatedUnion('success', [
	successfulResponseSchema,
	failedResponseSchema
]);

export type OptimizationConfig = z.infer<typeof optimizationConfigSchema>;
export type MatrixPayload = z.infer<typeof matrixPayloadSchema>;
export type Leg = z.infer<typeof legSchema>;
export type Route = z.infer<typeof routeSchema>;
export type OptimizationResult = z.infer<typeof optimizationResultSchema>;
export type OptimizationResponse = z.infer<typeof optimizationResponseSchema>;
export type SuccessfulOptimizationResponse = z.infer<
	typeof successfulResponseSchema
>;
export type FailedOptimizationResponse = z.infer<typeof failedResponseSchema>;

/**
 * Optimization Service
 * Handles route optimization using TSP Solver via SQS queue
 * Manages database operations and external API integration
 */
export class OptimizationService {
	private sqsClient: SQSClient;
	private queueUrl: string;
	private readonly DEFAULT_CONFIG = {
		start_at_depot: true,
		end_at_depot: true
	} as const;

	constructor(sqsClient?: SQSClient) {
		this.sqsClient =
			sqsClient ??
			new SQSClient({
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

	async queueOptimization(
		mapId: string,
		organizationId: string,
		userId: string,
		options: OptimizationOptions,
		requestId?: string
	) {
		const assignedDrivers = await this.fetchAssignedDrivers(
			mapId,
			organizationId
		);

		// Parse to non-empty - throws with clear message if no drivers
		const nonEmptyDrivers = parseNonEmptyOrThrow(
			assignedDrivers,
			'active drivers assigned to this map. Assign at least one driver before optimizing'
		);

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

		const vehicleIds = nonEmptyDrivers.map((d) => d.driver.id);

		const [job] = await db
			.insert(optimizationJobs)
			.values({
				organization_id: organizationId,
				status: 'pending',
				matrix_id: matrixResult.id,
				map_id: mapId,
				depot_id: options.depotId,
				created_by: userId,
				updated_by: userId
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

		// Validate payload matches expected schema BEFORE sending to SQS
		const sqsPayloadSchema = matrixPayloadSchema.extend({
			job_id: z.uuid()
		});
		const validatedPayload = sqsPayloadSchema.parse(payload);

		logger.info(
			{
				jobId: job.id,
				mapId,
				requestId,
				driverCount: vehicleIds.length,
				stopCount: coordinatesData.locationIds.length
			},
			'Optimization job created'
		);

		try {
			await this.sqsClient.send(
				new SendMessageCommand({
					QueueUrl: this.queueUrl,
					MessageBody: JSON.stringify(validatedPayload),
					MessageAttributes: {
						request_id: {
							DataType: 'String',
							StringValue: requestId || ''
						}
					}
				})
			);

			// Update to running after successful queue
			await this.updateJobStatus(job.id, 'running');
			logger.info({ jobId: job.id }, 'Job queued to SQS');
		} catch (error) {
			await this.updateJobStatus(
				job.id,
				'failed',
				'Failed to queue optimization job'
			);
			throw ServiceError.internal('Failed to queue optimization job', {
				cause: error
			});
		}

		return job;
	}

	async completeOptimization(response: OptimizationResponse) {
		const log = logger.child({ jobId: response.job_id });
		log.info(
			{ success: response.success },
			'Processing optimization completion'
		);

		try {
			const [job] = await db
				.select()
				.from(optimizationJobs)
				.where(eq(optimizationJobs.id, response.job_id))
				.limit(1);

			if (!job) {
				throw ServiceError.validation(
					`Optimization job ${response.job_id} not found`
				);
			}

			// Only process jobs in valid states (pending or running)
			// This handles cancelled jobs and prevents double-processing
			const validStatesForCompletion = ['pending', 'running'];
			if (!validStatesForCompletion.includes(job.status)) {
				log.info({ status: job.status }, 'Job not in valid state, skipping');
				return;
			}

			const {
				map_id: mapId,
				organization_id: organizationId,
				depot_id: depotId
			} = job;

			await this.updateJobStatus(response.job_id, 'completing');

			// Discriminated union: TypeScript narrows type based on success field
			if (!response.success) {
				log.warn(
					{ errorMessage: response.error_message },
					'Optimization failed'
				);
				await this.updateJobStatus(
					response.job_id,
					'failed',
					response.error_message // Type-safe: guaranteed to exist when success=false
				);
				throw ServiceError.internal(
					`Optimization failed to complete: ${response.error_message}`
				);
			}

			// TypeScript now knows: response.success === true, so response.result exists
			const result = response.result;

			const { depotCoord, locationCoordMap } = await this.getCoordinatesData(
				mapId,
				depotId,
				organizationId
			);

			await this.clearStopAssignments(mapId);
			await this.applyOptimizedRoutes(mapId, result);
			await this.computeAndSaveRoutes(
				mapId,
				organizationId,
				depotId,
				result,
				depotCoord,
				locationCoordMap
			);

			await this.updateJobStatus(response.job_id, 'completed');

			// Record credit usage based on number of stops optimized
			const totalStops = result.routes.reduce(
				(sum, route) => sum + route.legs.length,
				0
			);
			await billingService.recordUsage(
				organizationId,
				totalStops,
				response.job_id,
				`Route optimization: ${totalStops} stops`
			);

			log.info(
				{
					routeCount: result.routes.length,
					totalCost: result.total_cost,
					creditsUsed: totalStops
				},
				'Optimization completed successfully'
			);
		} catch (error) {
			// Recovery: mark job as failed before re-throwing
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
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
			.where(
				and(eq(stops.map_id, mapId), inArray(stops.location_id, allLocationIds))
			);

		const locationToStopId = new Map(
			matchingStops.map((s) => [s.location_id, s.id])
		);

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
		depotCoord: ValidatedCoordinate,
		locationCoordMap: Map<string, ValidatedCoordinate>
	): Promise<void> {
		const routePromises = result.routes.map(async (route) => {
			try {
				if (route.legs.length === 0) {
					return null;
				}

				// Validate all leg stop_ids exist in the map BEFORE using them
				const legStopIds = route.legs.map((leg) => leg.stop_id);
				const missingIds = legStopIds.filter((id) => !locationCoordMap.has(id));

				if (missingIds.length > 0) {
					return {
						driver_id: route.driver_id,
						success: false,
						error: `Missing coordinates for stops: ${missingIds.join(', ')}`
					};
				}

				// Safe to use - we've validated all keys exist
				const legCoords = route.legs.map(
					(leg) => locationCoordMap.get(leg.stop_id)!
				);

				const directions = await mapboxNavigation.getDirections([
					depotCoord,
					...legCoords,
					depotCoord
				]);

				if (directions.routes.length === 0) {
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
				return { driver_id: route.driver_id, success: false, error };
			}
		});

		const results = await Promise.all(routePromises);
		const failures = results.filter((r) => r && !r.success);
		if (failures.length > 0) {
			const failedDriverIds = failures
				.filter((f) => f)
				.map((f) => f!.driver_id)
				.join(', ');
			throw ServiceError.internal(
				`Failed to compute routes for ${failures.length} driver(s): ${failedDriverIds}`
			);
		}
	}

	async cancelOptimization(mapId: string, organizationId: string) {
		const job = await this.getActiveJobForMap(mapId, organizationId);

		if (!job) {
			throw ServiceError.validation(
				'No active optimization job found for this map'
			);
		}

		await this.updateJobStatus(job.id, 'cancelled');
		return { success: true };
	}

	// Valid state transitions for optimization jobs
	private readonly VALID_TRANSITIONS: Record<string, string[]> = {
		pending: ['running', 'cancelled', 'failed'],
		running: ['completing', 'cancelled', 'failed'],
		completing: ['completed', 'failed'],
		completed: [],
		failed: [],
		cancelled: []
	};

	private canTransition(from: string, to: string): boolean {
		return this.VALID_TRANSITIONS[from]?.includes(to) ?? false;
	}

	private async updateJobStatus(
		jobId: string,
		status:
			| 'pending'
			| 'running'
			| 'completing'
			| 'completed'
			| 'failed'
			| 'cancelled',
		errorMessage?: string
	): Promise<void> {
		// Get current status to validate transition
		const [job] = await db
			.select({ status: optimizationJobs.status })
			.from(optimizationJobs)
			.where(eq(optimizationJobs.id, jobId))
			.limit(1);

		if (!job) {
			throw ServiceError.notFound('Optimization job not found');
		}

		// Validate state transition - skip invalid transitions to handle race conditions gracefully
		if (!this.canTransition(job.status, status)) {
			return;
		}

		await db
			.update(optimizationJobs)
			.set({
				status,
				...(errorMessage && { error_message: errorMessage }),
				updated_at: new Date()
			})
			.where(eq(optimizationJobs.id, jobId));
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
			.where(
				and(
					eq(matrices.organization_id, organizationId),
					eq(matrices.inputsHash, inputHash)
				)
			)
			.limit(1);

		if (existingMatrix.length > 0) {
			return existingMatrix[0];
		}

		// Create new matrix via API using pre-fetched coordinates
		const matrixResult =
			await mapboxDistanceMatrix.createDistanceMatrix(coordinatesData);

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
		depotCoord: ValidatedCoordinate;
		locationCoordMap: Map<string, ValidatedCoordinate>;
	}> {
		const depot = await depotService.getDepotById(depotId, organizationId);

		// Parse depot coordinate - throws with context if invalid
		const depotCoord = parseCoordinateOrThrow(
			depot.location.lon,
			depot.location.lat,
			`depot ${depot.depot.name}`
		);

		const mapStops = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(eq(stops.map_id, mapId));

		// Parse into non-empty array - throws if no stops
		const nonEmptyStops = parseNonEmptyOrThrow(mapStops, 'stops for this map');

		nonEmptyStops.sort((a, b) =>
			(a.location.address_hash ?? '').localeCompare(
				b.location.address_hash ?? ''
			)
		);

		const coordinates: ValidatedCoordinate[] = [depotCoord];
		const locationIds: string[] = [depot.location.id];
		const locationCoordMap = new Map<string, ValidatedCoordinate>();
		locationCoordMap.set(depot.location.id, depotCoord);

		for (const { location } of nonEmptyStops) {
			// Parse each location coordinate - throws with context if invalid
			const coord = parseCoordinateOrThrow(
				location.lon,
				location.lat,
				`location ${location.address_line_1}`
			);
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

	private createInputHash(coordinatesData: {
		coordinates: [number, number][];
	}): string {
		const coordsString = coordinatesData.coordinates
			.map((coord) => `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`)
			.join('|');
		return createHash('sha256').update(coordsString).digest('hex');
	}
}

export const optimizationService = new OptimizationService();
