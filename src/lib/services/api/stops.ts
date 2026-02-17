import type {
	BulkCreateStops,
	CreateStop,
	ReorderStops,
	StopWithLocation,
	UpdateStop
} from '$lib/schemas/stop';
import { apiClient } from './base';

class StopApiService {
	/**
	 * Create a new stop
	 */
	async create(data: CreateStop): Promise<StopWithLocation> {
		return apiClient.post<StopWithLocation>('/stops', data);
	}

	/**
	 * Get a stop by ID
	 */
	async getById(stopId: string): Promise<StopWithLocation> {
		return apiClient.get<StopWithLocation>(`/stops/${stopId}`);
	}

	/**
	 * Update a stop
	 */
	async update(stopId: string, data: UpdateStop): Promise<StopWithLocation> {
		return apiClient.patch<StopWithLocation>(`/stops/${stopId}`, data);
	}

	/**
	 * Delete a stop
	 */
	async delete(stopId: string): Promise<{ success: boolean }> {
		return apiClient.delete<{ success: boolean }>(`/stops/${stopId}`);
	}

	/**
	 * Bulk create stops for a map
	 */
	async bulkCreate(
		mapId: string,
		data: BulkCreateStops
	): Promise<{ stops: StopWithLocation[] }> {
		return apiClient.post<{ stops: StopWithLocation[] }>(
			`/maps/${mapId}/stops`,
			data
		);
	}

	/**
	 * Reorder stops - update driver assignments and delivery indices
	 */
	async reorder(
		mapId: string,
		updates: ReorderStops['updates']
	): Promise<{ stops: StopWithLocation[] }> {
		return apiClient.post<{ stops: StopWithLocation[] }>(
			`/maps/${mapId}/stops/reorder`,
			{ updates }
		);
	}
}

export const stopApi = new StopApiService();
