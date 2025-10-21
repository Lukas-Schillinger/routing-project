import { db } from '$lib/server/db';
import { distanceMatrices, distanceMatrixEntries, locations, stops } from '$lib/server/db/schema';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { MapboxApiClient } from './mapbox-client.js';

/**
 * Distance matrix profile types
 */
export type DistanceMatrixProfile = 'driving' | 'driving-traffic' | 'walking' | 'cycling';

/**
 * Distance matrix provider
 */
export type DistanceMatrixProvider = 'mapbox' | 'geoapify';

/**
 * Distance matrix options
 */
export interface DistanceMatrixOptions {
	profile?: DistanceMatrixProfile;
	provider?: DistanceMatrixProvider;
	units?: 'metric' | 'imperial';
}

/**
 * Stop with location data for distance calculation
 */
interface StopWithCoordinates {
	stopId: string;
	lat: number;
	lon: number;
}

/**
 * Mapbox Matrix API response
 */
interface MapboxMatrixResponse {
	code: string;
	durations: number[][];
	distances: number[][];
	sources?: Array<{ location: [number, number] }>;
	destinations?: Array<{ location: [number, number] }>;
}

/**
 * Distance Matrix Service
 * Calculates distances and durations between all stops on a map
 */
export class DistanceMatrixService {
	private mapboxClient: MapboxApiClient;

	constructor() {
		this.mapboxClient = new MapboxApiClient();
	}

	/**
	 * Create a distance matrix for a map
	 * This calculates distances between all stops and stores them in the database
	 */
	async createDistanceMatrix(
		mapId: string,
		organizationId: string,
		options: DistanceMatrixOptions = {}
	): Promise<{ matrixId: string; entriesCount: number }> {
		const profile = options.profile || 'driving';
		const provider = options.provider || 'mapbox';
		const units = options.units || 'metric';

		// 1. Fetch all stops with their location coordinates
		const mapStops = await this.getStopsWithCoordinates(mapId);

		if (mapStops.length === 0) {
			throw new Error('No stops found for this map');
		}

		if (mapStops.length < 2) {
			throw new Error('At least 2 stops are required to create a distance matrix');
		}

		// Mapbox Matrix API has a limit of 25 coordinates
		if (mapStops.length > 25) {
			throw new Error(
				`Too many stops (${mapStops.length}). Maximum 25 stops supported by Mapbox Matrix API`
			);
		}

		// 2. Generate request hash for deduplication
		const requestHash = this.generateRequestHash(mapStops, profile, provider);

		// 3. Check if matrix already exists
		const existing = await db
			.select()
			.from(distanceMatrices)
			.where(eq(distanceMatrices.request_hash, requestHash))
			.limit(1);

		if (existing.length > 0) {
			const entriesCount = await this.getMatrixEntriesCount(existing[0].id);
			return {
				matrixId: existing[0].id,
				entriesCount
			};
		}

		// 4. Call Mapbox Matrix API
		const matrixData = await this.fetchMatrixFromMapbox(mapStops, profile);

		// 5. Create distance matrix record
		const [matrix] = await db
			.insert(distanceMatrices)
			.values({
				organization_id: organizationId,
				map_id: mapId,
				profile,
				units,
				provider,
				request_hash: requestHash,
				status: 'complete'
			})
			.returning();

		// 6. Insert all matrix entries
		const entries = this.buildMatrixEntries(
			matrix.id,
			organizationId,
			mapStops,
			matrixData.distances,
			matrixData.durations
		);

		await db.insert(distanceMatrixEntries).values(entries);

		return {
			matrixId: matrix.id,
			entriesCount: entries.length
		};
	}

	/**
	 * Get stops with their coordinates
	 */
	private async getStopsWithCoordinates(mapId: string): Promise<StopWithCoordinates[]> {
		const result = await db
			.select({
				stopId: stops.id,
				lat: locations.lat,
				lon: locations.lon
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(eq(stops.map_id, mapId));

		return result
			.filter((r) => r.lat && r.lon)
			.map((r) => ({
				stopId: r.stopId,
				lat: parseFloat(r.lat!),
				lon: parseFloat(r.lon!)
			}));
	}

	/**
	 * Generate a hash for deduplication
	 */
	private generateRequestHash(
		stops: StopWithCoordinates[],
		profile: string,
		provider: string
	): string {
		const data = {
			stops: stops.map((s) => ({ lat: s.lat, lon: s.lon })),
			profile,
			provider
		};
		return createHash('sha256').update(JSON.stringify(data)).digest('hex');
	}

	/**
	 * Fetch matrix data from Mapbox Matrix API
	 */
	private async fetchMatrixFromMapbox(
		stops: StopWithCoordinates[],
		profile: DistanceMatrixProfile
	): Promise<MapboxMatrixResponse> {
		// Build coordinates string: "lon1,lat1;lon2,lat2;..."
		const coordinates = stops.map((s) => `${s.lon},${s.lat}`).join(';');

		// Call Mapbox Matrix API
		const endpoint = `/directions-matrix/v1/mapbox/${profile}/${coordinates}`;

		const response = await this.mapboxClient.request<MapboxMatrixResponse>(endpoint, {
			method: 'GET'
		});

		if (response.code !== 'Ok') {
			throw new Error(`Mapbox Matrix API error: ${response.code}`);
		}

		if (!response.distances || !response.durations) {
			throw new Error('Invalid response from Mapbox Matrix API');
		}

		return response;
	}

	/**
	 * Build matrix entries from API response
	 */
	private buildMatrixEntries(
		matrixId: string,
		organizationId: string,
		stops: StopWithCoordinates[],
		distances: number[][],
		durations: number[][]
	) {
		const entries = [];

		for (let i = 0; i < stops.length; i++) {
			for (let j = 0; j < stops.length; j++) {
				entries.push({
					organization_id: organizationId,
					matrix_id: matrixId,
					origin_stop_id: stops[i].stopId,
					dest_stop_id: stops[j].stopId,
					distance_meters: Math.round(distances[i][j]),
					duration_seconds: Math.round(durations[i][j])
				});
			}
		}

		return entries;
	}

	/**
	 * Get count of entries for a matrix
	 */
	private async getMatrixEntriesCount(matrixId: string): Promise<number> {
		const result = await db
			.select()
			.from(distanceMatrixEntries)
			.where(eq(distanceMatrixEntries.matrix_id, matrixId));

		return result.length;
	}

	/**
	 * Get distance matrix for a map
	 */
	async getDistanceMatrix(mapId: string) {
		const [matrix] = await db
			.select()
			.from(distanceMatrices)
			.where(eq(distanceMatrices.map_id, mapId))
			.limit(1);

		if (!matrix) {
			return null;
		}

		const entries = await db
			.select()
			.from(distanceMatrixEntries)
			.where(eq(distanceMatrixEntries.matrix_id, matrix.id));

		return {
			matrix,
			entries
		};
	}

	/**
	 * Get distance between two stops
	 */
	async getDistance(
		matrixId: string,
		originStopId: string,
		destStopId: string
	): Promise<{ distance: number; duration: number } | null> {
		const [entry] = await db
			.select({
				distance: distanceMatrixEntries.distance_meters,
				duration: distanceMatrixEntries.duration_seconds
			})
			.from(distanceMatrixEntries)
			.where(
				eq(distanceMatrixEntries.matrix_id, matrixId) &&
					eq(distanceMatrixEntries.origin_stop_id, originStopId) &&
					eq(distanceMatrixEntries.dest_stop_id, destStopId)
			)
			.limit(1);

		if (!entry) {
			return null;
		}

		return {
			distance: entry.distance,
			duration: entry.duration
		};
	}
}

// Export singleton instance
export const distanceMatrixService = new DistanceMatrixService();
