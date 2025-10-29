import { tspSolverClient } from './client';
import {
	matrixPayloadSchema,
	optimizationResultSchema,
	type MatrixPayload,
	type OptimizationConfig,
	type OptimizationResult
} from './types';

/**
 * TSP Solver Optimization Service
 * Handles route optimization using the FastAPI TSP solver
 */
class TspSolverOptimizationService {
	/**
	 * Optimize routes using the TSP solver
	 *
	 * @param matrix - Distance/duration matrix (2D array)
	 * @param stopIds - Array of stop IDs corresponding to matrix indices
	 * @param vehicleIds - Array of vehicle/driver IDs to assign routes to
	 * @param config - Optimization configuration options
	 * @returns Optimized routes with driver assignments
	 */
	async optimize(
		matrix: number[][],
		stopIds: string[],
		vehicleIds: string[],
		config: OptimizationConfig
	): Promise<OptimizationResult> {
		// Validate input
		this.validateInput(matrix, stopIds, vehicleIds);

		// Build payload
		const payload: MatrixPayload = {
			matrix,
			stop_ids: stopIds,
			vehicle_ids: vehicleIds,
			config
		};

		// Validate payload against schema
		const validatedPayload = matrixPayloadSchema.parse(payload);

		// Make API request
		const response = await tspSolverClient.post<OptimizationResult>('/solve', validatedPayload);

		// Validate response
		const validatedResponse = optimizationResultSchema.parse(response);

		return validatedResponse;
	}

	/**
	 * Validate input parameters
	 */
	private validateInput(matrix: number[][], stopIds: string[], vehicleIds: string[]): void {
		// Check matrix is square
		const matrixSize = matrix.length;
		if (matrixSize === 0) {
			throw new Error('Matrix cannot be empty');
		}

		for (let i = 0; i < matrix.length; i++) {
			if (matrix[i].length !== matrixSize) {
				throw new Error(
					`Matrix must be square. Row ${i} has ${matrix[i].length} columns, expected ${matrixSize}`
				);
			}
		}

		// Check stop IDs match matrix size
		if (stopIds.length !== matrixSize) {
			throw new Error(
				`Number of stop IDs (${stopIds.length}) must match matrix size (${matrixSize})`
			);
		}

		// Check we have at least one vehicle
		if (vehicleIds.length === 0) {
			throw new Error('At least one vehicle ID is required');
		}

		// Check for duplicate IDs
		const uniqueStopIds = new Set(stopIds);
		if (uniqueStopIds.size !== stopIds.length) {
			throw new Error('Stop IDs must be unique');
		}

		const uniqueVehicleIds = new Set(vehicleIds);
		if (uniqueVehicleIds.size !== vehicleIds.length) {
			throw new Error('Vehicle IDs must be unique');
		}
	}

	/**
	 * Check if the TSP solver service is available
	 */
	async isAvailable(): Promise<boolean> {
		return await tspSolverClient.healthCheck();
	}
}

// Singleton instance
export const tspSolverOptimization = new TspSolverOptimizationService();
