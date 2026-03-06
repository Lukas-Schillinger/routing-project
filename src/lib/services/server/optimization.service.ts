import { env } from '$env/dynamic/private';
import {
	optimizationJobSchema,
	type JobStatus,
	type OptimizationJob,
	type OptimizationOptions
} from '$lib/schemas/map';
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
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { mapboxDistanceMatrix, mapboxNavigation } from '../external/mapbox';
import type { CoordinatesData } from '../external/mapbox/distance-matrix';
import type { Coordinate } from '../external/mapbox/types';
import { depotService } from './depot.service';
import { ServiceError } from './errors';
import { mapService } from './map.service';
import { routeService } from './route.service';

// ============================================================================
// Validated Types (Parse, Don't Validate)
// ============================================================================

/** Branded type - carries proof of validation in the type */
type Brand<T, B extends string> = T & { readonly __brand: B };

/** A coordinate validated for range and numeric values */
type ValidatedCoordinate = Brand<Coordinate, 'ValidatedCoordinate'>;

/** An array guaranteed to have at least one element */
type NonEmptyArray<T> = [T, ...T[]];

/** Type guard to check if array is non-empty */
function isNonEmpty<T>(arr: T[]): arr is NonEmptyArray<T> {
	return arr.length > 0;
}

/** Parse array into NonEmptyArray or throw with context */
function requireNonEmpty<T>(arr: T[], context: string): NonEmptyArray<T> {
	if (!isNonEmpty(arr)) {
		throw ServiceError.validation(`Expected non-empty array for ${context}`);
	}
	return arr;
}

/** Parse and validate a coordinate, throwing with context if invalid */
function parseCoordinate(
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

	const isValidLon = lonNum >= -180 && lonNum <= 180;
	const isValidLat = latNum >= -90 && latNum <= 90;

	if (!isValidLon || !isValidLat) {
		throw ServiceError.validation(
			`Coordinates out of range for ${context}: lon=${lonNum}, lat=${latNum}`
		);
	}

	return [lonNum, latNum] as ValidatedCoordinate;
}

export const optimizationConfigSchema = z.object({
	fairness: z.enum(['high', 'medium', 'low']).default('medium')
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

export const routeOptimizationResultSchema = z.object({
	driver_id: z.string(),
	travel_duration: z.number().int(),
	legs: z.array(legSchema)
});

export const optimizationResultSchema = z.object({
	routes: z.array(routeOptimizationResultSchema),
	total_travel_duration: z.number().int().optional()
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
export type RouteOptimizationResult = z.infer<
	typeof routeOptimizationResultSchema
>;
export type OptimizationResult = z.infer<typeof optimizationResultSchema>;
export type OptimizationResponse = z.infer<typeof optimizationResponseSchema>;
export type SuccessfulOptimizationResponse = z.infer<
	typeof successfulResponseSchema
>;
export type FailedOptimizationResponse = z.infer<typeof failedResponseSchema>;

/**
 * Result returned from completeOptimization for billing purposes.
 * Returns null when job was already processed (idempotency) or optimization failed.
 */
export type OptimizationCompletionResult = {
	stopCount: number;
	organizationId: string;
	jobId: string;
} | null;

// ============================================================================
// State Machine
// ============================================================================

/** Valid state transitions for optimization jobs */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
	pending: ['running', 'cancelled', 'failed'],
	running: ['completing', 'cancelled', 'failed'],
	completing: ['completed', 'failed'],
	completed: [],
	failed: [],
	cancelled: []
};

/**
 * Optimization Service
 * Handles route optimization via TSP Solver and SQS queue.
 */
export class OptimizationService {
	private sqsClient: SQSClient;
	private queueUrl: string;

	constructor(sqsClient?: SQSClient) {
		this.sqsClient = sqsClient ?? this.createDefaultSQSClient();
		this.queueUrl = env.OPTIMIZATION_QUEUE_URL;
	}

	private createDefaultSQSClient(): SQSClient {
		return new SQSClient({
			region: env.AWS_REGION || '',
			credentials: {
				accessKeyId: env.AWS_ACCESS_KEY_ID || '',
				secretAccessKey: env.AWS_SECRET_ACCESS_KEY || ''
			}
		});
	}

	async getActiveJobForMap(
		mapId: string,
		organizationId: string
	): Promise<OptimizationJob | null> {
		const activeStatuses: JobStatus[] = ['pending', 'running', 'completing'];

		const [job] = await db
			.select()
			.from(optimizationJobs)
			.where(
				and(
					eq(optimizationJobs.map_id, mapId),
					eq(optimizationJobs.organization_id, organizationId),
					inArray(optimizationJobs.status, activeStatuses)
				)
			)
			.orderBy(desc(optimizationJobs.created_at))
			.limit(1);

		return job ?? null;
	}

	async queueOptimization(
		mapId: string,
		organizationId: string,
		userId: string,
		options: OptimizationOptions,
		requestId?: string
	): Promise<OptimizationJob> {
		// Parallel: fetch map and assigned drivers (independent queries)
		const [map, assignedDrivers] = await Promise.all([
			mapService.getMapById(mapId, organizationId),
			this.fetchAssignedDrivers(mapId, organizationId)
		]);

		const depotId = options.depotId ?? map.depot_id;
		if (!depotId) {
			throw ServiceError.validation(
				'No depot selected. Select a depot before optimizing routes.'
			);
		}

		const nonEmptyDrivers = requireNonEmpty(
			assignedDrivers,
			'active drivers assigned to this map. Assign at least one driver before optimizing'
		);

		const { coordinatesData } = await this.getCoordinatesData(
			mapId,
			depotId,
			organizationId
		);

		const matrixResult = await this.getOrCreateDistanceMatrix(
			organizationId,
			mapId,
			coordinatesData
		);

		const vehicleIds = nonEmptyDrivers.map((d) => d.driver.id);
		const job = await this.createJob(
			mapId,
			organizationId,
			userId,
			depotId,
			matrixResult.id
		);

		const payload = this.buildSQSPayload(
			job.id,
			matrixResult.matrix,
			coordinatesData.locationIds,
			vehicleIds,
			options.fairness
		);

		await this.sendToSQS(job.id, payload, requestId);

		return job;
	}

	private async createJob(
		mapId: string,
		organizationId: string,
		userId: string,
		depotId: string,
		matrixId: string
	): Promise<OptimizationJob> {
		const [job] = await db
			.insert(optimizationJobs)
			.values({
				organization_id: organizationId,
				status: 'pending',
				matrix_id: matrixId,
				map_id: mapId,
				depot_id: depotId,
				created_by: userId,
				updated_by: userId
			})
			.returning();

		return job;
	}

	private buildSQSPayload(
		jobId: string,
		matrix: number[][],
		stopIds: string[],
		vehicleIds: string[],
		fairness: OptimizationOptions['fairness']
	): z.infer<typeof matrixPayloadSchema> & { job_id: string } {
		const payload = {
			job_id: jobId,
			matrix,
			stop_ids: stopIds,
			vehicle_ids: vehicleIds,
			config: { fairness }
		};

		const sqsPayloadSchema = matrixPayloadSchema.extend({ job_id: z.uuid() });
		return sqsPayloadSchema.parse(payload);
	}

	private async sendToSQS(
		jobId: string,
		payload: z.infer<typeof matrixPayloadSchema> & { job_id: string },
		requestId?: string
	): Promise<void> {
		try {
			await this.sqsClient.send(
				new SendMessageCommand({
					QueueUrl: this.queueUrl,
					MessageBody: JSON.stringify(payload),
					MessageAttributes: {
						request_id: {
							DataType: 'String',
							StringValue: requestId || ''
						}
					}
				})
			);

			await this.updateJobStatus(jobId, 'running');
			logger.info({ jobId }, 'Job queued to SQS');
		} catch (error) {
			await this.updateJobStatus(
				jobId,
				'failed',
				'Failed to queue optimization job'
			);
			throw ServiceError.internal('Failed to queue optimization job', {
				cause: error
			});
		}
	}

	async completeOptimization(
		response: OptimizationResponse
	): Promise<OptimizationCompletionResult> {
		const log = logger.child({ jobId: response.job_id });
		log.info(
			{ success: response.success },
			'Processing optimization completion'
		);

		const job = await this.getJobById(response.job_id);

		const completableStatuses: JobStatus[] = ['pending', 'running'];
		if (!completableStatuses.includes(job.status)) {
			log.info({ status: job.status }, 'Job not in valid state, skipping');
			return null;
		}

		try {
			return await this.processCompletion(job, response, log);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown error';
			await this.updateJobStatus(response.job_id, 'failed', errorMessage);
			throw error;
		}
	}

	private async getJobById(jobId: string): Promise<OptimizationJob> {
		const [job] = await db
			.select()
			.from(optimizationJobs)
			.where(eq(optimizationJobs.id, jobId))
			.limit(1);

		if (!job) {
			throw ServiceError.validation(`Optimization job ${jobId} not found`);
		}

		return optimizationJobSchema.parse(job);
	}

	private async processCompletion(
		job: OptimizationJob,
		response: OptimizationResponse,
		log: typeof logger
	): Promise<OptimizationCompletionResult> {
		const {
			map_id: mapId,
			organization_id: organizationId,
			depot_id: depotId
		} = job;
		const jobId = response.job_id;

		await this.updateJobStatus(jobId, 'completing');

		if (!response.success) {
			log.warn({ errorMessage: response.error_message }, 'Optimization failed');
			await this.updateJobStatus(jobId, 'failed', response.error_message);
			throw ServiceError.internal(
				`Optimization failed to complete: ${response.error_message}`
			);
		}

		const result = response.result;

		// Parallel: coordinates fetch and clearing assignments are independent
		const [{ depotCoord, locationCoordMap }] = await Promise.all([
			this.getCoordinatesData(mapId, depotId, organizationId),
			this.clearStopAssignments(mapId)
		]);

		await this.applyOptimizedRoutes(mapId, result);

		await this.computeAndSaveRoutes(
			mapId,
			organizationId,
			depotId,
			result,
			depotCoord,
			locationCoordMap,
			job.created_by ?? undefined
		);

		await this.updateJobStatus(jobId, 'completed');

		const stopCount = OptimizationService.countTotalStops(result);
		log.info(
			{
				routeCount: result.routes.length,
				totalDuration: result.total_travel_duration,
				stopCount
			},
			'Optimization completed'
		);

		return { stopCount, organizationId, jobId };
	}

	/** Count total stops across all routes in an optimization result */
	static countTotalStops(result: OptimizationResult): number {
		return result.routes.reduce((sum, route) => sum + route.legs.length, 0);
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

		type StopUpdate = {
			stopId: string;
			driverId: string;
			deliveryIndex: number;
		};

		const updates: StopUpdate[] = optimizationResult.routes.flatMap((route) =>
			route.legs
				.map((leg, i) => {
					const stopId = locationToStopId.get(leg.stop_id);
					if (!stopId) return null;
					return { stopId, driverId: route.driver_id, deliveryIndex: i };
				})
				.filter((update): update is StopUpdate => update !== null)
		);

		if (updates.length === 0) return;

		// Bulk UPDATE using VALUES join — single query instead of N individual updates
		const valuesRows = updates.map(
			(u) =>
				sql`(${u.stopId}::uuid, ${u.driverId}::uuid, ${u.deliveryIndex}::integer)`
		);

		await db.execute(sql`
			UPDATE stops SET
				driver_id = v.driver_id,
				delivery_index = v.delivery_index,
				updated_at = NOW()
			FROM (VALUES ${sql.join(valuesRows, sql`, `)}) AS v(stop_id, driver_id, delivery_index)
			WHERE stops.id = v.stop_id
		`);
	}

	private async computeAndSaveRoutes(
		mapId: string,
		organizationId: string,
		depotId: string,
		result: OptimizationResult,
		depotCoord: ValidatedCoordinate,
		locationCoordMap: Map<string, ValidatedCoordinate>,
		userId?: string
	): Promise<void> {
		type DirectionsResult = {
			driverId: string;
			geometry: { type: 'LineString'; coordinates: [number, number][] };
			duration: number;
		};
		type FailureResult = { driverId: string; error: string };

		// Fetch all Mapbox directions in parallel
		const directionResults: DirectionsResult[] = [];
		const failures: FailureResult[] = [];

		await Promise.all(
			result.routes.map(async (route) => {
				if (route.legs.length === 0) return;

				const legStopIds = route.legs.map((leg) => leg.stop_id);
				const missingIds = legStopIds.filter((id) => !locationCoordMap.has(id));

				if (missingIds.length > 0) {
					failures.push({
						driverId: route.driver_id,
						error: `Missing coordinates for stops: ${missingIds.join(', ')}`
					});
					return;
				}

				try {
					const legCoords = route.legs.map(
						(leg) => locationCoordMap.get(leg.stop_id)!
					);
					const directions = await mapboxNavigation.getDirections([
						depotCoord,
						...legCoords,
						depotCoord
					]);

					if (directions.routes.length === 0) return;

					const { geometry, duration } = directions.routes[0];
					directionResults.push({
						driverId: route.driver_id,
						geometry,
						duration
					});
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Unknown error';
					failures.push({ driverId: route.driver_id, error: errorMessage });
				}
			})
		);

		if (failures.length > 0) {
			const failedDriverIds = failures.map((f) => f.driverId).join(', ');
			throw ServiceError.internal(
				`Failed to compute routes for ${failures.length} driver(s): ${failedDriverIds}`
			);
		}

		// Bulk upsert all routes in a single query
		if (directionResults.length > 0) {
			await routeService.bulkUpsertRoutesInternal(
				directionResults.map((r) => ({
					organization_id: organizationId,
					map_id: mapId,
					driver_id: r.driverId,
					depot_id: depotId,
					geometry: r.geometry,
					duration: r.duration
				})),
				userId
			);
		}
	}

	async cancelOptimization(
		mapId: string,
		organizationId: string
	): Promise<{ success: boolean }> {
		const job = await this.getActiveJobForMap(mapId, organizationId);

		if (!job) {
			throw ServiceError.validation(
				'No active optimization job found for this map'
			);
		}

		await this.updateJobStatus(job.id, 'cancelled');
		return { success: true };
	}

	private async updateJobStatus(
		jobId: string,
		status: JobStatus,
		errorMessage?: string
	): Promise<void> {
		// Compute which statuses can transition to the target status
		const validFromStatuses = (
			Object.entries(VALID_TRANSITIONS) as [JobStatus, JobStatus[]][]
		)
			.filter(([, targets]) => targets.includes(status))
			.map(([from]) => from);

		// Single atomic conditional UPDATE — no separate SELECT needed
		await db
			.update(optimizationJobs)
			.set({
				status,
				...(errorMessage && { error_message: errorMessage }),
				updated_at: new Date()
			})
			.where(
				and(
					eq(optimizationJobs.id, jobId),
					inArray(optimizationJobs.status, validFromStatuses)
				)
			);
	}

	private async getOrCreateDistanceMatrix(
		organizationId: string,
		mapId: string,
		coordinatesData: CoordinatesData
	): Promise<typeof matrices.$inferSelect> {
		const inputHash = this.createInputHash(coordinatesData);

		const [existingMatrix] = await db
			.select()
			.from(matrices)
			.where(
				and(
					eq(matrices.organization_id, organizationId),
					eq(matrices.inputsHash, inputHash)
				)
			)
			.limit(1);

		if (existingMatrix) {
			return existingMatrix;
		}

		const matrixResult =
			await mapboxDistanceMatrix.createDistanceMatrix(coordinatesData);

		const [newMatrix] = await db
			.insert(matrices)
			.values({
				organization_id: organizationId,
				map_id: mapId,
				inputsHash: inputHash,
				matrix: matrixResult.matrix
			})
			.onConflictDoNothing({
				target: [matrices.organization_id, matrices.inputsHash]
			})
			.returning();

		if (newMatrix) {
			return newMatrix;
		}

		// Conflict: another request inserted first — fetch the winning row
		const [existing] = await db
			.select()
			.from(matrices)
			.where(
				and(
					eq(matrices.organization_id, organizationId),
					eq(matrices.inputsHash, inputHash)
				)
			)
			.limit(1);

		if (!existing) {
			throw ServiceError.notFound('Distance matrix lost after conflict');
		}

		return existing;
	}

	private async fetchAssignedDrivers(
		mapId: string,
		organizationId: string
	): Promise<{ driver: typeof drivers.$inferSelect }[]> {
		return db
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
		// Parallel: depot and stops queries are independent
		const [depot, mapStops] = await Promise.all([
			depotService.getDepotById(depotId, organizationId),
			db
				.select({ stop: stops, location: locations })
				.from(stops)
				.innerJoin(locations, eq(stops.location_id, locations.id))
				.where(eq(stops.map_id, mapId))
		]);

		const depotCoord = parseCoordinate(
			depot.location.lon,
			depot.location.lat,
			`depot ${depot.depot.name}`
		);

		const nonEmptyStops = requireNonEmpty(mapStops, 'stops for this map');
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
			const coord = parseCoordinate(
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
