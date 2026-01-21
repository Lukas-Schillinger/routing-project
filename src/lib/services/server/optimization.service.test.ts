import { db } from '$lib/server/db';
import {
	creditTransactions,
	depots,
	driverMapMemberships,
	drivers,
	locations,
	maps,
	matrices,
	optimizationJobs,
	organizations,
	routes,
	stops,
	users
} from '$lib/server/db/schema';
import {
	createDepot,
	createDriver,
	createDriverMapMembership,
	createLocation,
	createMap,
	createMatrix,
	createOptimizationJob,
	createOrganization,
	createStop,
	createUser,
	type TestTransaction
} from '$lib/testing';
import { createMockSqsService } from '$lib/testing/mocks';
import { eq, inArray } from 'drizzle-orm';
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from 'vitest';
import { ServiceError } from './errors';
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

// Test fixtures
let testOrg1: { id: string };
let testUser1: { id: string };
let testMap1: { id: string };
let testDriver1: { id: string };
let testDepot1: { id: string };
let testLocation1: { id: string };
let testStopLocation1: { id: string };
let testStopLocation2: { id: string };

// Track created IDs for cleanup
const createdIds = {
	jobs: [] as string[],
	matrices: [] as string[],
	routes: [] as string[],
	stops: [] as string[],
	memberships: [] as string[],
	depots: [] as string[],
	maps: [] as string[],
	locations: [] as string[],
	drivers: [] as string[],
	users: [] as string[],
	orgs: [] as string[]
};

beforeAll(async () => {
	const tx = db as unknown as TestTransaction;

	// Create org and its resources
	testOrg1 = await createOrganization(tx, { name: 'Optimization Test Org' });
	createdIds.orgs.push(testOrg1.id);

	testUser1 = await createUser(tx, {
		organization_id: testOrg1.id,
		role: 'admin'
	});
	createdIds.users.push(testUser1.id);

	testLocation1 = await createLocation(tx, { organization_id: testOrg1.id });
	testStopLocation1 = await createLocation(tx, {
		organization_id: testOrg1.id
	});
	testStopLocation2 = await createLocation(tx, {
		organization_id: testOrg1.id
	});
	createdIds.locations.push(
		testLocation1.id,
		testStopLocation1.id,
		testStopLocation2.id
	);

	testMap1 = await createMap(tx, { organization_id: testOrg1.id });
	createdIds.maps.push(testMap1.id);

	testDriver1 = await createDriver(tx, {
		organization_id: testOrg1.id,
		active: true
	});
	createdIds.drivers.push(testDriver1.id);

	testDepot1 = await createDepot(tx, {
		organization_id: testOrg1.id,
		location_id: testLocation1.id,
		default_depot: true
	});
	createdIds.depots.push(testDepot1.id);
});

afterAll(async () => {
	// Clean up in correct FK order
	if (createdIds.routes.length > 0) {
		await db.delete(routes).where(inArray(routes.id, createdIds.routes));
	}
	// Credit transactions reference optimization_jobs, so delete first
	if (createdIds.jobs.length > 0) {
		await db
			.delete(creditTransactions)
			.where(inArray(creditTransactions.optimization_job_id, createdIds.jobs));
	}
	if (createdIds.jobs.length > 0) {
		await db
			.delete(optimizationJobs)
			.where(inArray(optimizationJobs.id, createdIds.jobs));
	}
	if (createdIds.matrices.length > 0) {
		await db.delete(matrices).where(inArray(matrices.id, createdIds.matrices));
	}
	if (createdIds.stops.length > 0) {
		await db.delete(stops).where(inArray(stops.id, createdIds.stops));
	}
	if (createdIds.memberships.length > 0) {
		await db
			.delete(driverMapMemberships)
			.where(inArray(driverMapMemberships.id, createdIds.memberships));
	}
	if (createdIds.depots.length > 0) {
		await db.delete(depots).where(inArray(depots.id, createdIds.depots));
	}
	if (createdIds.maps.length > 0) {
		await db.delete(maps).where(inArray(maps.id, createdIds.maps));
	}
	if (createdIds.locations.length > 0) {
		await db
			.delete(locations)
			.where(inArray(locations.id, createdIds.locations));
	}
	if (createdIds.drivers.length > 0) {
		await db.delete(drivers).where(inArray(drivers.id, createdIds.drivers));
	}
	if (createdIds.users.length > 0) {
		await db.delete(users).where(inArray(users.id, createdIds.users));
	}
	if (createdIds.orgs.length > 0) {
		await db
			.delete(organizations)
			.where(inArray(organizations.id, createdIds.orgs));
	}
});

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
			const tx = db as unknown as TestTransaction;

			// Create new map for this test
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			// Assign driver to map
			const membership = await createDriverMapMembership(tx, {
				organization_id: testOrg1.id,
				driver_id: testDriver1.id,
				map_id: newMap.id
			});
			createdIds.memberships.push(membership.id);

			// Create stops for the map
			const stop1 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id
			});
			const stop2 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation2.id
			});
			createdIds.stops.push(stop1.id, stop2.id);

			const job = await optimizationService.queueOptimization(
				newMap.id,
				testOrg1.id,
				testUser1.id,
				{ depotId: testDepot1.id, fairness: 'medium' }
			);
			createdIds.jobs.push(job.id);

			expect(job.id).toBeDefined();
			expect(job.status).toBe('pending');
			expect(mockSqs.messages).toHaveLength(1);
			expect(mockSqs.messages[0].body).toMatchObject({
				job_id: job.id,
				matrix: expect.any(Array),
				stop_ids: expect.any(Array),
				vehicle_ids: expect.arrayContaining([testDriver1.id])
			});
		});

		it('throws validation error when no drivers assigned', async () => {
			const tx = db as unknown as TestTransaction;

			// Create map with no driver memberships
			const emptyMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(emptyMap.id);

			// Add a stop so we have something to optimize
			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: emptyMap.id,
				location_id: testStopLocation1.id
			});
			createdIds.stops.push(stop.id);

			try {
				await optimizationService.queueOptimization(
					emptyMap.id,
					testOrg1.id,
					testUser1.id,
					{ depotId: testDepot1.id, fairness: 'medium' }
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).message).toContain('drivers');
			}
		});

		it('throws validation error when no stops exist', async () => {
			const tx = db as unknown as TestTransaction;

			// Create map with driver but no stops
			const emptyMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(emptyMap.id);

			const membership = await createDriverMapMembership(tx, {
				organization_id: testOrg1.id,
				driver_id: testDriver1.id,
				map_id: emptyMap.id
			});
			createdIds.memberships.push(membership.id);

			try {
				await optimizationService.queueOptimization(
					emptyMap.id,
					testOrg1.id,
					testUser1.id,
					{ depotId: testDepot1.id, fairness: 'medium' }
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).message).toContain('stops');
			}
		});

		it('sets audit fields on job creation', async () => {
			const tx = db as unknown as TestTransaction;

			// Create new map for this test
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			// Assign driver to map
			const membership = await createDriverMapMembership(tx, {
				organization_id: testOrg1.id,
				driver_id: testDriver1.id,
				map_id: newMap.id
			});
			createdIds.memberships.push(membership.id);

			// Create stops for the map
			const stop1 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id
			});
			createdIds.stops.push(stop1.id);

			const job = await optimizationService.queueOptimization(
				newMap.id,
				testOrg1.id,
				testUser1.id,
				{ depotId: testDepot1.id, fairness: 'medium' }
			);
			createdIds.jobs.push(job.id);

			expect(job.created_by).toBe(testUser1.id);
			expect(job.updated_by).toBe(testUser1.id);
		});

		it('blocks optimization when credit balance is negative', async () => {
			const tx = db as unknown as TestTransaction;

			// Create negative credit balance
			await db.insert(creditTransactions).values({
				organization_id: testOrg1.id,
				type: 'usage',
				amount: -100,
				expires_at: null
			});

			// Create map with driver and stops
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			const membership = await createDriverMapMembership(tx, {
				organization_id: testOrg1.id,
				driver_id: testDriver1.id,
				map_id: newMap.id
			});
			createdIds.memberships.push(membership.id);

			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id
			});
			createdIds.stops.push(stop.id);

			try {
				await optimizationService.queueOptimization(
					newMap.id,
					testOrg1.id,
					testUser1.id,
					{ depotId: testDepot1.id, fairness: 'medium' }
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).code).toBe('FORBIDDEN');
				expect((error as ServiceError).message).toContain(
					'Insufficient credits'
				);
			}

			// Clean up credit transaction
			await db
				.delete(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg1.id));
		});

		it('allows optimization when credit balance is zero (single op can go negative)', async () => {
			const tx = db as unknown as TestTransaction;

			// Ensure zero balance (no transactions)
			await db
				.delete(creditTransactions)
				.where(eq(creditTransactions.organization_id, testOrg1.id));

			// Create map with driver and stops
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			const membership = await createDriverMapMembership(tx, {
				organization_id: testOrg1.id,
				driver_id: testDriver1.id,
				map_id: newMap.id
			});
			createdIds.memberships.push(membership.id);

			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id
			});
			createdIds.stops.push(stop.id);

			// Should succeed with zero balance
			const job = await optimizationService.queueOptimization(
				newMap.id,
				testOrg1.id,
				testUser1.id,
				{ depotId: testDepot1.id, fairness: 'medium' }
			);
			createdIds.jobs.push(job.id);

			expect(job.id).toBeDefined();
			expect(job.status).toBe('pending');
		});
	});

	describe('Handle Webhook Response', () => {
		it('marks job as failed on error response', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a pending job
			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'running' // Must be in valid state for completion
			});
			createdIds.jobs.push(job.id);

			await expect(
				optimizationService.completeOptimization({
					success: false,
					job_id: job.id,
					error_message: 'Solver timeout'
				})
			).rejects.toThrow();

			// Verify job marked as failed
			const [updatedJob] = await db
				.select()
				.from(optimizationJobs)
				.where(eq(optimizationJobs.id, job.id))
				.limit(1);

			expect(updatedJob.status).toBe('failed');
			expect(updatedJob.error_message).toBe('Solver timeout');
		});

		it('skips completion for cancelled jobs', async () => {
			const tx = db as unknown as TestTransaction;

			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'cancelled' // Already cancelled
			});
			createdIds.jobs.push(job.id);

			// Should not throw, just skip
			await optimizationService.completeOptimization({
				success: true,
				job_id: job.id,
				result: {
					routes: [],
					total_cost: 0
				}
			});

			// Status should remain cancelled
			const [updatedJob] = await db
				.select()
				.from(optimizationJobs)
				.where(eq(optimizationJobs.id, job.id))
				.limit(1);

			expect(updatedJob.status).toBe('cancelled');
		});
	});

	describe('Status Transitions', () => {
		it('transitions pending -> failed on SQS error', async () => {
			const tx = db as unknown as TestTransaction;

			// Create new map for this test
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			// Setup
			const membership = await createDriverMapMembership(tx, {
				organization_id: testOrg1.id,
				driver_id: testDriver1.id,
				map_id: newMap.id
			});
			createdIds.memberships.push(membership.id);

			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id
			});
			createdIds.stops.push(stop.id);

			// Make SQS fail
			mockSqs.send.mockRejectedValueOnce(new Error('SQS unavailable'));

			try {
				await optimizationService.queueOptimization(
					newMap.id,
					testOrg1.id,
					testUser1.id,
					{ depotId: testDepot1.id, fairness: 'medium' }
				);
				expect.fail('Should have thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(ServiceError);
				expect((error as ServiceError).message).toContain('queue');
			}
		});

		it('allows cancellation of pending job', async () => {
			const tx = db as unknown as TestTransaction;

			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: testMap1.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'pending'
			});
			createdIds.jobs.push(job.id);

			await optimizationService.cancelOptimization(testMap1.id, testOrg1.id);

			const [updatedJob] = await db
				.select()
				.from(optimizationJobs)
				.where(eq(optimizationJobs.id, job.id))
				.limit(1);

			expect(updatedJob.status).toBe('cancelled');
		});
	});

	describe('Complete Optimization Success Path', () => {
		it('clears existing stop assignments on completion', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new map
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			// Create driver
			const driver = await createDriver(tx, {
				organization_id: testOrg1.id,
				active: true
			});
			createdIds.drivers.push(driver.id);

			// Create stops WITH existing assignments
			const stop1 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id,
				driver_id: driver.id,
				delivery_index: 0
			});
			const stop2 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation2.id,
				driver_id: driver.id,
				delivery_index: 1
			});
			createdIds.stops.push(stop1.id, stop2.id);

			// Create job in running state
			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'running'
			});
			createdIds.jobs.push(job.id);

			// Complete with empty routes (to test clearStopAssignments without applyOptimizedRoutes)
			await optimizationService.completeOptimization({
				success: true,
				job_id: job.id,
				result: {
					routes: [],
					total_cost: 0
				}
			});

			// Verify stops had assignments cleared
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

		it(
			'applies optimized routes and creates route geometry',
			async () => {
				const tx = db as unknown as TestTransaction;

				// Create a new map
				const newMap = await createMap(tx, { organization_id: testOrg1.id });
				createdIds.maps.push(newMap.id);

				// Create driver
				const driver = await createDriver(tx, {
					organization_id: testOrg1.id,
					active: true
				});
				createdIds.drivers.push(driver.id);

				// Create stops (unassigned)
				const stop1 = await createStop(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					location_id: testStopLocation1.id
				});
				const stop2 = await createStop(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					location_id: testStopLocation2.id
				});
				createdIds.stops.push(stop1.id, stop2.id);

				// Create job in running state
				const matrix = await createMatrix(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id
				});
				createdIds.matrices.push(matrix.id);

				const job = await createOptimizationJob(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					matrix_id: matrix.id,
					depot_id: testDepot1.id,
					status: 'running'
				});
				createdIds.jobs.push(job.id);

				// Complete with routes that assign stops to driver
				await optimizationService.completeOptimization({
					success: true,
					job_id: job.id,
					result: {
						routes: [
							{
								driver_id: driver.id,
								legs: [
									{ stop_id: testStopLocation1.id, stop_index: 0 },
									{ stop_id: testStopLocation2.id, stop_index: 1 }
								],
								cost: 900
							}
						],
						total_cost: 900
					}
				});

				// Verify stops have correct assignments
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

				// Verify route was created
				const [createdRoute] = await db
					.select()
					.from(routes)
					.where(eq(routes.map_id, newMap.id))
					.limit(1);

				expect(createdRoute).toBeDefined();
				expect(createdRoute.driver_id).toBe(driver.id);
				expect(createdRoute.depot_id).toBe(testDepot1.id);
				expect(createdRoute.geometry).toBeDefined();
				createdIds.routes.push(createdRoute.id);
			},
			{ timeout: 15000 }
		);

		it(
			'handles multiple drivers with multiple routes',
			async () => {
				const tx = db as unknown as TestTransaction;

				// Create a new map
				const newMap = await createMap(tx, { organization_id: testOrg1.id });
				createdIds.maps.push(newMap.id);

				// Create two drivers
				const driver1 = await createDriver(tx, {
					organization_id: testOrg1.id,
					active: true
				});
				const driver2 = await createDriver(tx, {
					organization_id: testOrg1.id,
					active: true
				});
				createdIds.drivers.push(driver1.id, driver2.id);

				// Create additional locations
				const loc3 = await createLocation(tx, { organization_id: testOrg1.id });
				const loc4 = await createLocation(tx, { organization_id: testOrg1.id });
				createdIds.locations.push(loc3.id, loc4.id);

				// Create stops
				const stop1 = await createStop(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					location_id: testStopLocation1.id
				});
				const stop2 = await createStop(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					location_id: testStopLocation2.id
				});
				const stop3 = await createStop(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					location_id: loc3.id
				});
				const stop4 = await createStop(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					location_id: loc4.id
				});
				createdIds.stops.push(stop1.id, stop2.id, stop3.id, stop4.id);

				// Create job
				const matrix = await createMatrix(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id
				});
				createdIds.matrices.push(matrix.id);

				const job = await createOptimizationJob(tx, {
					organization_id: testOrg1.id,
					map_id: newMap.id,
					matrix_id: matrix.id,
					depot_id: testDepot1.id,
					status: 'running'
				});
				createdIds.jobs.push(job.id);

				// Complete with routes for both drivers
				await optimizationService.completeOptimization({
					success: true,
					job_id: job.id,
					result: {
						routes: [
							{
								driver_id: driver1.id,
								legs: [
									{ stop_id: testStopLocation1.id, stop_index: 0 },
									{ stop_id: testStopLocation2.id, stop_index: 1 }
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

				// Verify driver1's stops
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

				// Verify driver2's stops
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

				// Verify two routes were created
				const createdRoutes = await db
					.select()
					.from(routes)
					.where(eq(routes.map_id, newMap.id));

				expect(createdRoutes).toHaveLength(2);
				createdRoutes.forEach((r) => createdIds.routes.push(r.id));
			},
			{ timeout: 15000 }
		);

		it('marks job as completed after successful processing', async () => {
			const tx = db as unknown as TestTransaction;

			// Create a new map
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			// Create at least one stop (required by completeOptimization)
			const stop = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id
			});
			createdIds.stops.push(stop.id);

			// Create job in running state
			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'running'
			});
			createdIds.jobs.push(job.id);

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

		it('records credit usage after successful optimization', async () => {
			const tx = db as unknown as TestTransaction;

			// Create new map for this test
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			// Create stops
			const stop1 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation1.id
			});
			const stop2 = await createStop(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				location_id: testStopLocation2.id
			});
			createdIds.stops.push(stop1.id, stop2.id);

			// Create matrix and job
			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'running'
			});
			createdIds.jobs.push(job.id);

			// Complete with 2 stops in route
			await optimizationService.completeOptimization({
				success: true,
				job_id: job.id,
				result: {
					routes: [
						{
							driver_id: testDriver1.id,
							legs: [
								{ stop_id: testStopLocation1.id, stop_index: 0 },
								{ stop_id: testStopLocation2.id, stop_index: 1 }
							],
							cost: 500
						}
					],
					total_cost: 500
				}
			});

			// Verify credit transaction was recorded
			const [transaction] = await db
				.select()
				.from(creditTransactions)
				.where(eq(creditTransactions.optimization_job_id, job.id))
				.limit(1);

			expect(transaction).toBeDefined();
			expect(transaction.type).toBe('usage');
			expect(transaction.amount).toBe(-2); // 2 stops = -2 credits
			expect(transaction.organization_id).toBe(testOrg1.id);
		}, 15000);
	});

	describe('getActiveJobForMap()', () => {
		it('returns pending job when exists', async () => {
			const tx = db as unknown as TestTransaction;

			// Create new map to avoid conflicts
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'pending'
			});
			createdIds.jobs.push(job.id);

			const activeJob = await optimizationService.getActiveJobForMap(
				newMap.id,
				testOrg1.id
			);

			expect(activeJob).not.toBeNull();
			expect(activeJob?.id).toBe(job.id);
		});

		it('returns null when no active jobs', async () => {
			const tx = db as unknown as TestTransaction;

			// Create new map to avoid conflicts
			const newMap = await createMap(tx, { organization_id: testOrg1.id });
			createdIds.maps.push(newMap.id);

			// Create a completed job (not active)
			const matrix = await createMatrix(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id
			});
			createdIds.matrices.push(matrix.id);

			const job = await createOptimizationJob(tx, {
				organization_id: testOrg1.id,
				map_id: newMap.id,
				matrix_id: matrix.id,
				depot_id: testDepot1.id,
				status: 'completed'
			});
			createdIds.jobs.push(job.id);

			const activeJob = await optimizationService.getActiveJobForMap(
				newMap.id,
				testOrg1.id
			);

			expect(activeJob).toBeNull();
		});
	});
});
