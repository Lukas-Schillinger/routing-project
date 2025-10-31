import type { Driver } from '$lib/schemas/driver';
import type { CreateMap, Map, MapWithStats, UpdateMap } from '$lib/schemas/map';
import type { Stop } from '$lib/schemas/stop';
import type { GeocodeCSVResult } from '$lib/services/server/csv-import.service';
import { apiClient } from './base';

export interface DriverMembership {
	membership: {
		id: string;
		driver_id: string;
		map_id: string;
		created_at: Date;
		updated_at: Date;
	};
	driver: Driver;
}

/**
 * Options for route optimization using TSP solver
 */
export interface OptimizationOptions {
	depotId: string;
	fairness?: 'high' | 'medium' | 'low';
	timeLimitSec?: number;
	startAtDepot?: boolean;
	endAtDepot?: boolean;
}

/**
 * Optimization result from TSP solver
 */
export interface OptimizationResult {
	result: {
		success: boolean;
		routes: Array<{
			driver_id: string;
			total_distance: number;
			total_duration: number;
			legs: Array<{
				stop_id: string;
				distance: number;
				duration: number;
			}>;
		}>;
		total_distance: number;
		total_duration: number;
		computation_time: number;
	};
}

class MapApiService {
	/**
	 * Get all maps for the authenticated user's organization
	 */
	async getAll(includeStats = false): Promise<Map[]> {
		const params = includeStats ? '?includeStats=true' : '';
		return apiClient.get<Map[]>(`/maps${params}`);
	}

	/**
	 * Get a specific map by ID with optional stats
	 */
	async getById(mapId: string): Promise<{ map: Map | MapWithStats }> {
		return apiClient.get<{ map: Map | MapWithStats }>(`/maps/${mapId}`);
	}

	/**
	 * Create a new map
	 */
	async create(data: CreateMap): Promise<{ map: Map }> {
		return apiClient.post<{ map: Map }>('/maps', data);
	}

	/**
	 * Create a new map from CSV geocoding results
	 */
	async createFromCSV(
		mapName: string,
		geocodeResults: GeocodeCSVResult[]
	): Promise<{
		map: Map;
		stops: Stop[];
	}> {
		return apiClient.post('/maps/from-csv-upload', {
			mapName,
			geocodeResults
		});
	}

	/**
	 * Update a map
	 */
	async update(mapId: string, data: UpdateMap): Promise<{ map: Map }> {
		return apiClient.patch<{ map: Map }>(`/maps/${mapId}`, data);
	}

	/**
	 * Delete a map
	 */
	async delete(mapId: string): Promise<{ success: boolean }> {
		return apiClient.delete<{ success: boolean }>(`/maps/${mapId}`);
	}

	// Driver Membership Methods

	/**
	 * Get all drivers assigned to a map
	 */
	async getDrivers(mapId: string): Promise<DriverMembership[]> {
		const result = await apiClient.get<{ memberships: DriverMembership[] }>(
			`/maps/${mapId}/drivers`
		);
		return result.memberships;
	}

	/**
	 * Assign a driver to a map
	 */
	async addDriver(mapId: string, driverId: string): Promise<DriverMembership['membership']> {
		const result = await apiClient.post<{ membership: DriverMembership['membership'] }>(
			`/maps/${mapId}/drivers`,
			{ driver_id: driverId }
		);
		return result.membership;
	}

	/**
	 * Remove a driver from a map
	 */
	async removeDriver(mapId: string, driverId: string): Promise<{ success: boolean }> {
		return apiClient.delete<{ success: boolean }>(`/maps/${mapId}/drivers/${driverId}`);
	}

	// Optimization Methods

	/**
	 * Optimize routes for a map using TSP solver
	 */
	async optimize(mapId: string, options: OptimizationOptions): Promise<OptimizationResult> {
		const body = {
			depotId: options.depotId,
			fairness: options.fairness || 'medium',
			timeLimitSec: options.timeLimitSec || 30,
			startAtDepot: options.startAtDepot !== false,
			endAtDepot: options.endAtDepot !== false
		};
		return apiClient.post<OptimizationResult>(`/maps/${mapId}/optimize`, body);
	}

	/**
	 * Reset optimization for a map (clear driver assignments)
	 */
	async resetOptimization(mapId: string): Promise<{ success: boolean }> {
		return apiClient.post<{ success: boolean }>(`/maps/${mapId}/reset-optimization`);
	}

	/**
	 * Geocode CSV file and return enriched records with location data
	 */
	async geocodeCSV(file: File): Promise<GeocodeCSVResult[]> {
		const formData = new FormData();
		formData.append('csvFile', file);

		return apiClient.post<GeocodeCSVResult[]>('/maps/geocode-csv', formData);
	}
}

export const mapApi = new MapApiService();
