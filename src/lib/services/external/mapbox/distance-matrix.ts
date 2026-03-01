import { ServiceError } from '$lib/services/server/errors';
import { mapboxClient } from './client';
import { matrixResponseSchema, type MatrixResponse } from './types';

/**
 * Coordinates data for distance matrix computation
 */
export type CoordinatesData = {
	/** Ordered coordinates array (depot first, then stops) */
	coordinates: [number, number][];
	/** Ordered array of location IDs corresponding to addresses */
	locationIds: string[];
};

/**
 * Result returned from distance matrix service
 */
export type DistanceMatrixResult = {
	/** Distance matrix in seconds (row-major: [source][destination]) */
	matrix: number[][];
	/** Ordered array of location IDs corresponding to addresses */
	locationIds: string[];
};

/**
 * Mapbox Distance Matrix API service
 */
class MapboxDistanceMatrixService {
	/**
	 * Create a distance matrix from pre-fetched coordinates
	 *
	 * @param coordinatesData - Pre-fetched coordinates, addresses, and location IDs
	 * @returns Distance matrix with depot first, followed by stops
	 */
	async createDistanceMatrix(
		coordinatesData: CoordinatesData
	): Promise<DistanceMatrixResult> {
		const { coordinates, locationIds } = coordinatesData;

		// Validate coordinate count (Mapbox limit: 2-25 for most profiles, 2-10 for driving-traffic)
		const profile = 'mapbox/driving';
		const maxCoordinates = 25;

		if (coordinates.length > maxCoordinates) {
			throw ServiceError.validation(
				`Too many locations (${coordinates.length}). Maximum for ${profile} is ${maxCoordinates}.`
			);
		}

		if (coordinates.length < 2) {
			throw ServiceError.validation(
				'At least 2 locations required (depot + 1 stop minimum)'
			);
		}

		// Build request
		const coordinatesParam = coordinates
			.map(([lon, lat]) => `${lon},${lat}`)
			.join(';');
		const endpoint = `/directions-matrix/v1/${profile}/${coordinatesParam}`;

		const params: Record<string, string> = {
			annotations: 'duration'
		};

		// Make API request
		const response = await mapboxClient.get<MatrixResponse>(endpoint, params);

		// Validate response
		const validatedResponse = matrixResponseSchema.parse(response);

		if (validatedResponse.code !== 'Ok') {
			throw ServiceError.internal(
				validatedResponse.message || 'Mapbox Matrix API returned an error'
			);
		}

		if (!validatedResponse.durations) {
			throw ServiceError.internal(
				'Mapbox Matrix API returned no distance or duration data'
			);
		}

		return {
			matrix: validatedResponse.durations,
			locationIds
		};
	}
}

// Singleton instance
export const mapboxDistanceMatrix = new MapboxDistanceMatrixService();
