import type {
	DepotCreate,
	DepotUpdate,
	DepotWithLocationJoin
} from '$lib/schemas/depot';
import { apiClient } from './base';

class DepotApiService {
	/**
	 * Get all depots for the authenticated user's organization
	 */
	async getAll(): Promise<DepotWithLocationJoin[]> {
		return apiClient.get<DepotWithLocationJoin[]>('/depots');
	}

	/**
	 * Get a specific depot by ID
	 */
	async getById(depotId: string): Promise<DepotWithLocationJoin> {
		return apiClient.get<DepotWithLocationJoin>(`/depots/${depotId}`);
	}

	/**
	 * Create a new depot with location
	 */
	async create(data: DepotCreate): Promise<DepotWithLocationJoin> {
		return apiClient.post<DepotWithLocationJoin>('/depots', data);
	}

	/**
	 * Update a depot
	 */
	async update(
		depotId: string,
		data: DepotUpdate
	): Promise<DepotWithLocationJoin> {
		return apiClient.patch<DepotWithLocationJoin>(`/depots/${depotId}`, data);
	}

	/**
	 * Delete a depot
	 */
	async delete(depotId: string): Promise<{ success: boolean }> {
		return apiClient.delete<{ success: boolean }>(`/depots/${depotId}`);
	}

	/**
	 * Set a depot as the default depot
	 */
	async setAsDefault(depotId: string): Promise<DepotWithLocationJoin> {
		return this.update(depotId, { default_depot: true });
	}

	/**
	 * Get the default depot for the organization
	 */
	async getDefault(): Promise<DepotWithLocationJoin | null> {
		const depots = await this.getAll();
		return depots.find((d) => d.depot.default_depot) || null;
	}
}

// Singleton instance
export const depotApi = new DepotApiService();
