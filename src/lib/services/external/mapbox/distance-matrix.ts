import { db } from '$lib/server/db';
import { locations, stops } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { depotService } from '../../server/depot.service';
import { ServiceError } from '../../server/errors';
import { mapboxClient } from './client';
import { matrixResponseSchema, type MatrixResponse } from './types';

/**
 * Result returned from distance matrix service
 */
export interface DistanceMatrixResult {
	/** Distance matrix in seconds (row-major: [source][destination]) */
	matrix: number[][];
	/** Ordered array of addresses (depot first, then stops) */
	addresses: string[];
	/** Ordered array of location IDs corresponding to addresses */
	locationIds: string[];
	/** Raw Mapbox API response */
	rawResponse: MatrixResponse;
}

/**
 * Mapbox Distance Matrix API service
 * Computes travel times and distances between multiple locations
 */
class MapboxDistanceMatrixService {
	/**
	 * Create a distance matrix for a map with a depot
	 *
	 * @param mapId - The map ID containing stops
	 * @param depotId - The depot ID (will be first in matrix)
	 * @param organizationId - Organization ID for access control
	 * @param options - Matrix computation options
	 * @returns Distance matrix with depot first, followed by stops
	 */
	async createDistanceMatrix(
		mapId: string,
		depotId: string,
		organizationId: string
	): Promise<DistanceMatrixResult> {
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

		// Validate all stops have coordinates
		for (const { stop, location } of mapStops) {
			if (!location.lon || !location.lat) {
				throw ServiceError.validation(
					`Stop "${location.name || stop.id}" has no coordinates. Geocode all stops before creating distance matrix.`
				);
			}
		}

		// Build coordinates array with depot first
		const coordinates: [number, number][] = [
			[Number(depot.location.lon), Number(depot.location.lat)]
		];

		const addresses: string[] = [depot.location.address_line1 || depot.depot.name || 'Depot'];

		const locationIds: string[] = [depot.location.id];

		// Add all stop coordinates
		for (const { location } of mapStops) {
			coordinates.push([Number(location.lon), Number(location.lat)]);
			addresses.push(location.address_line1 || location.name || 'Unknown');
			locationIds.push(location.id);
		}

		// Validate coordinate count (Mapbox limit: 2-25 for most profiles, 2-10 for driving-traffic)
		const profile = 'mapbox/driving';
		const maxCoordinates = 25;

		if (coordinates.length > maxCoordinates) {
			throw ServiceError.validation(
				`Too many locations (${coordinates.length}). Maximum for ${profile} is ${maxCoordinates}.`
			);
		}

		if (coordinates.length < 2) {
			throw ServiceError.validation('At least 2 locations required (depot + 1 stop minimum)');
		}

		// Build request
		const coordinatesParam = coordinates.map(([lon, lat]) => `${lon},${lat}`).join(';');
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
			throw ServiceError.internal('Mapbox Matrix API returned no distance or duration data');
		}

		return {
			matrix: validatedResponse.durations || [],
			addresses,
			locationIds,
			rawResponse: validatedResponse
		};
	}
}

// Singleton instance
export const mapboxDistanceMatrix = new MapboxDistanceMatrixService();
