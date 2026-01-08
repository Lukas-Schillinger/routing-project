import type {
	CreateStop,
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
}

export const stopApi = new StopApiService();
