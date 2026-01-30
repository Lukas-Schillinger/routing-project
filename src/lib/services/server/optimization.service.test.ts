import { db } from '$lib/server/db';
import { optimizationJobs, routes, stops } from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createDriverMapMembership,
	createLocation,
	createMap,
	createMatrix,
	createOptimizationJob,
	createStop,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import { createMockSqsService } from '$lib/testing/mocks';
import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OptimizationService } from './optimization.service';

/**
 * Optimization Service Tests
 *
 * Tests cover:
 * - Queue optimization request
 * - Handle webhook response
 * - Status transitions
 * - Audit trail fields
 */

// Mock external services
vi.mock('$lib/services/external/mapbox', () => ({
	mapboxDistanceMatrix: {
		createDistanceMatrix: vi.fn().mockResolvedValue({
			matrix: [
				[0, 300, 600],
				[300, 0, 400],
				[600, 400, 0]
			]
		})
	},
	mapboxNavigation: {
		getDirections: vi.fn().mockResolvedValue({
			code: 'Ok',
			routes: [
				{
					geometry: {
						type: 'LineString',
						coordinates: [
							[-81.95, 28.03],
							[-81.96, 28.04]
						]
					},
					duration: 600,
					distance: 2000,
					legs: []
				}
			],
			waypoints: []
		})
	}
}));

/**
 * Creates a complete optimization test setup.
 * Billing is now handled at the API layer, so no billing setup is needed here.
 */
async function createOptimizationTestSetup() {
	const { organization, user } = await createTestEnvironment();

	// Add locations for depot and stops
	const depotLocation = await createLocation({
		organization_id: organization.id
	});
	const stopLocation1 = await createLocation({
		organization_id: organization.id
	});
	const stopLocation2 = await createLocation({
		organization_id: organization.id
	});

	const map = await createMap({ organization_id: organization.id });

	const driver = await createDriver({
		organization_id: organization.id,
		active: true
	});

	const depot = await createDepot({
		organization_id: organization.id,
		location_id: depotLocation.id,
		default_depot: true
	});

	return {
		organization,
		user,
		map,
		driver,
		depot,
		depotLocation,
		stopLocation1,
		stopLocation2
	};
}

describe('OptimizationService', () => {
	let mockSqs: ReturnType<typeof createMockSqsService>;
	let optimizationService: OptimizationService;

	beforeEach(() => {
		mockSqs = createMockSqsService();
		optimizationService = new OptimizationService(mockSqs as unknown as never);
		mockSqs.clear();
	});

	describe('Queue Optimization Request', () => {
		it('creates job and sends to SQS queue', async () => {
			await withTestTransaction(async () => {
				const {
					organization,
					user,
					map,
					driver,
					depot,
					stopLocation1,
					stopLocation2
				} = await createOptimizationTestSetup();

				await createDriverMapMembership({
					organization_id: organization.id,
					driver_id: driver.id,
					map_id: map.id
				});

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id
				});
				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation2.id
				});

				const job = await optimizationService.queueOptimization(
					map.id,
					organization.id,
					user.id,
					{ depotId: depot.id, fairness: 'medium' }
				);

				expect(job.id).toBeDefined();
				expect(job.status).toBe('pending');
				expect(mockSqs.messages).toHaveLength(1);
				expect(mockSqs.messages[0].body).toMatchObject({
					job_id: job.id,
					matrix: expect.any(Array),
					stop_ids: expect.any(Array),
					vehicle_ids: expect.arrayContaining([driver.id])
				});
			});
		});

		it('throws validation error when no drivers assigned', async () => {
			await withTestTransaction(async () => {
				const { organization, user, depot, stopLocation1 } =
					await createOptimizationTestSetup();

				const emptyMap = await createMap({ organization_id: organization.id });

				await createStop({
					organization_id: organization.id,
					map_id: emptyMap.id,
					location_id: stopLocation1.id
				});

				await expect(
					optimizationService.queueOptimization(
						emptyMap.id,
						organization.id,
						user.id,
						{ depotId: depot.id, fairness: 'medium' }
					)
				).rejects.toMatchObject({
					code: 'VALIDATION',
					message: expect.stringContaining('drivers')
				});
			});
		});

		it('throws validation error when no stops exist', async () => {
			await withTestTransaction(async () => {
				const { organization, user, driver, depot } =
					await createOptimizationTestSetup();

				const emptyMap = await createMap({ organization_id: organization.id });

				await createDriverMapMembership({
					organization_id: organization.id,
					driver_id: driver.id,
					map_id: emptyMap.id
				});

				await expect(
					optimizationService.queueOptimization(
						emptyMap.id,
						organization.id,
						user.id,
						{ depotId: depot.id, fairness: 'medium' }
					)
				).rejects.toMatchObject({
					code: 'VALIDATION',
					message: expect.stringContaining('stops')
				});
			});
		});

		it('sets audit fields on job creation', async () => {
			await withTestTransaction(async () => {
				const { organization, user, map, driver, depot, stopLocation1 } =
					await createOptimizationTestSetup();

				await createDriverMapMembership({
					organization_id: organization.id,
					driver_id: driver.id,
					map_id: map.id
				});

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id
				});

				const job = await optimizationService.queueOptimization(
					map.id,
					organization.id,
					user.id,
					{ depotId: depot.id, fairness: 'medium' }
				);

				expect(job.created_by).toBe(user.id);
				expect(job.updated_by).toBe(user.id);
			});
		});
	});

	describe('Handle Webhook Response', () => {
		it('marks job as failed on error response', async () => {
			await withTestTransaction(async () => {
				const { organization, map, depot } =
					await createOptimizationTestSetup();

				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});

				const job = await createOptimizationJob({
					organization_id: organization.id,
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					status: 'running'
				});

				await expect(
					optimizationService.completeOptimization({
						success: false,
						job_id: job.id,
						error_message: 'Solver timeout'
					})
				).rejects.toThrow();

				const [updatedJob] = await db
					.select()
					.from(optimizationJobs)
					.where(eq(optimizationJobs.id, job.id))
					.limit(1);

				expect(updatedJob.status).toBe('failed');
				expect(updatedJob.error_message).toBe('Solver timeout');
			});
		});

		it('skips completion for cancelled jobs', async () => {
			await withTestTransaction(async () => {
				const { organization, map, depot } =
					await createOptimizationTestSetup();

				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});

				const job = await createOptimizationJob({
					organization_id: organization.id,
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					status: 'cancelled'
				});

				// Should not throw, just skip
				await optimizationService.completeOptimization({
					success: true,
					job_id: job.id,
					result: {
						routes: [],
						total_cost: 0
					}
				});

				const [updatedJob] = await db
					.select()
					.from(optimizationJobs)
					.where(eq(optimizationJobs.id, job.id))
					.limit(1);

				expect(updatedJob.status).toBe('cancelled');
			});
		});
	});

	describe('Status Transitions', () => {
		it('transitions pending -> failed on SQS error', async () => {
			await withTestTransaction(async () => {
				const { organization, user, map, driver, depot, stopLocation1 } =
					await createOptimizationTestSetup();

				await createDriverMapMembership({
					organization_id: organization.id,
					driver_id: driver.id,
					map_id: map.id
				});

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id
				});

				// Make SQS fail
				mockSqs.send.mockRejectedValueOnce(new Error('SQS unavailable'));

				await expect(
					optimizationService.queueOptimization(
						map.id,
						organization.id,
						user.id,
						{ depotId: depot.id, fairness: 'medium' }
					)
				).rejects.toMatchObject({
					message: expect.stringContaining('queue')
				});
			});
		});

		it('allows cancellation of pending job', async () => {
			await withTestTransaction(async () => {
				const { organization, map, depot } =
					await createOptimizationTestSetup();

				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});

				const job = await createOptimizationJob({
					organization_id: organization.id,
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					status: 'pending'
				});

				await optimizationService.cancelOptimization(map.id, organization.id);

				const [updatedJob] = await db
					.select()
					.from(optimizationJobs)
					.where(eq(optimizationJobs.id, job.id))
					.limit(1);

				expect(updatedJob.status).toBe('cancelled');
			});
		});
	});

	describe('Complete Optimization Success Path', () => {
		it('clears existing stop assignments on completion', async () => {
			await withTestTransaction(async () => {
				const {
					organization,
					map,
					driver,
					depot,
					stopLocation1,
					stopLocation2
				} = await createOptimizationTestSetup();

				// Create stops WITH existing assignments
				const stop1 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id,
					driver_id: driver.id,
					delivery_index: 0
				});
				const stop2 = await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation2.id,
					driver_id: driver.id,
					delivery_index: 1
				});

				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});

				const job = await createOptimizationJob({
					organization_id: organization.id,
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					status: 'running'
				});

				// Complete with empty routes (to test clearStopAssignments)
				await optimizationService.completeOptimization({
					success: true,
					job_id: job.id,
					result: {
						routes: [],
						total_cost: 0
					}
				});

				const [updatedStop1] = await db
					.select()
					.from(stops)
					.where(eq(stops.id, stop1.id))
					.limit(1);

				const [updatedStop2] = await db
					.select()
					.from(stops)
					.where(eq(stops.id, stop2.id))
					.limit(1);

				expect(updatedStop1.driver_id).toBeNull();
				expect(updatedStop1.delivery_index).toBeNull();
				expect(updatedStop2.driver_id).toBeNull();
				expect(updatedStop2.delivery_index).toBeNull();
			});
		});

		it(
			'applies optimized routes and creates route geometry',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { organization, driver, depot, stopLocation1, stopLocation2 } =
						await createOptimizationTestSetup();

					const newMap = await createMap({ organization_id: organization.id });

					// Create stops (unassigned)
					const stop1 = await createStop({
						organization_id: organization.id,
						map_id: newMap.id,
						location_id: stopLocation1.id
					});
					const stop2 = await createStop({
						organization_id: organization.id,
						map_id: newMap.id,
						location_id: stopLocation2.id
					});

					const matrix = await createMatrix({
						organization_id: organization.id,
						map_id: newMap.id
					});

					const job = await createOptimizationJob({
						organization_id: organization.id,
						map_id: newMap.id,
						matrix_id: matrix.id,
						depot_id: depot.id,
						status: 'running'
					});

					await optimizationService.completeOptimization({
						success: true,
						job_id: job.id,
						result: {
							routes: [
								{
									driver_id: driver.id,
									legs: [
										{ stop_id: stopLocation1.id, stop_index: 0 },
										{ stop_id: stopLocation2.id, stop_index: 1 }
									],
									cost: 900
								}
							],
							total_cost: 900
						}
					});

					const [updatedStop1] = await db
						.select()
						.from(stops)
						.where(eq(stops.id, stop1.id))
						.limit(1);

					const [updatedStop2] = await db
						.select()
						.from(stops)
						.where(eq(stops.id, stop2.id))
						.limit(1);

					expect(updatedStop1.driver_id).toBe(driver.id);
					expect(updatedStop1.delivery_index).toBe(0);
					expect(updatedStop2.driver_id).toBe(driver.id);
					expect(updatedStop2.delivery_index).toBe(1);

					const [createdRoute] = await db
						.select()
						.from(routes)
						.where(eq(routes.map_id, newMap.id))
						.limit(1);

					expect(createdRoute).toBeDefined();
					expect(createdRoute.driver_id).toBe(driver.id);
					expect(createdRoute.depot_id).toBe(depot.id);
					expect(createdRoute.geometry).toBeDefined();
				});
			}
		);

		it(
			'handles multiple drivers with multiple routes',
			{ timeout: 15000 },
			async () => {
				await withTestTransaction(async () => {
					const { organization, depot, stopLocation1, stopLocation2 } =
						await createOptimizationTestSetup();

					const newMap = await createMap({ organization_id: organization.id });

					const driver1 = await createDriver({
						organization_id: organization.id,
						active: true
					});
					const driver2 = await createDriver({
						organization_id: organization.id,
						active: true
					});

					const loc3 = await createLocation({
						organization_id: organization.id
					});
					const loc4 = await createLocation({
						organization_id: organization.id
					});

					const stop1 = await createStop({
						organization_id: organization.id,
						map_id: newMap.id,
						location_id: stopLocation1.id
					});
					const stop2 = await createStop({
						organization_id: organization.id,
						map_id: newMap.id,
						location_id: stopLocation2.id
					});
					const stop3 = await createStop({
						organization_id: organization.id,
						map_id: newMap.id,
						location_id: loc3.id
					});
					const stop4 = await createStop({
						organization_id: organization.id,
						map_id: newMap.id,
						location_id: loc4.id
					});

					const matrix = await createMatrix({
						organization_id: organization.id,
						map_id: newMap.id
					});

					const job = await createOptimizationJob({
						organization_id: organization.id,
						map_id: newMap.id,
						matrix_id: matrix.id,
						depot_id: depot.id,
						status: 'running'
					});

					await optimizationService.completeOptimization({
						success: true,
						job_id: job.id,
						result: {
							routes: [
								{
									driver_id: driver1.id,
									legs: [
										{ stop_id: stopLocation1.id, stop_index: 0 },
										{ stop_id: stopLocation2.id, stop_index: 1 }
									],
									cost: 900
								},
								{
									driver_id: driver2.id,
									legs: [
										{ stop_id: loc3.id, stop_index: 0 },
										{ stop_id: loc4.id, stop_index: 1 }
									],
									cost: 900
								}
							],
							total_cost: 1800
						}
					});

					const [s1] = await db
						.select()
						.from(stops)
						.where(eq(stops.id, stop1.id))
						.limit(1);
					const [s2] = await db
						.select()
						.from(stops)
						.where(eq(stops.id, stop2.id))
						.limit(1);

					expect(s1.driver_id).toBe(driver1.id);
					expect(s2.driver_id).toBe(driver1.id);

					const [s3] = await db
						.select()
						.from(stops)
						.where(eq(stops.id, stop3.id))
						.limit(1);
					const [s4] = await db
						.select()
						.from(stops)
						.where(eq(stops.id, stop4.id))
						.limit(1);

					expect(s3.driver_id).toBe(driver2.id);
					expect(s4.driver_id).toBe(driver2.id);

					const createdRoutes = await db
						.select()
						.from(routes)
						.where(eq(routes.map_id, newMap.id));

					expect(createdRoutes).toHaveLength(2);
				});
			}
		);

		it('marks job as completed after successful processing', async () => {
			await withTestTransaction(async () => {
				const { organization, map, depot, stopLocation1 } =
					await createOptimizationTestSetup();

				await createStop({
					organization_id: organization.id,
					map_id: map.id,
					location_id: stopLocation1.id
				});

				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});

				const job = await createOptimizationJob({
					organization_id: organization.id,
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					status: 'running'
				});

				await optimizationService.completeOptimization({
					success: true,
					job_id: job.id,
					result: {
						routes: [],
						total_cost: 0
					}
				});

				const [updatedJob] = await db
					.select()
					.from(optimizationJobs)
					.where(eq(optimizationJobs.id, job.id))
					.limit(1);

				expect(updatedJob.status).toBe('completed');
			});
		});
	});

	describe('getActiveJobForMap()', () => {
		it('returns pending job when exists', async () => {
			await withTestTransaction(async () => {
				const { organization, map, depot } =
					await createOptimizationTestSetup();

				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});

				const job = await createOptimizationJob({
					organization_id: organization.id,
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					status: 'pending'
				});

				const activeJob = await optimizationService.getActiveJobForMap(
					map.id,
					organization.id
				);

				expect(activeJob).not.toBeNull();
				expect(activeJob?.id).toBe(job.id);
			});
		});

		it('returns null when no active jobs', async () => {
			await withTestTransaction(async () => {
				const { organization, map, depot } =
					await createOptimizationTestSetup();

				const matrix = await createMatrix({
					organization_id: organization.id,
					map_id: map.id
				});

				await createOptimizationJob({
					organization_id: organization.id,
					map_id: map.id,
					matrix_id: matrix.id,
					depot_id: depot.id,
					status: 'completed'
				});

				const activeJob = await optimizationService.getActiveJobForMap(
					map.id,
					organization.id
				);

				expect(activeJob).toBeNull();
			});
		});
	});
});
