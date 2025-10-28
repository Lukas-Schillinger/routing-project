import type { Driver, DriverCreate, DriverUpdate } from '$lib/schemas/driver';
import { apiClient } from './base';

class DriverApiService {
	/**
	 * Get all drivers for the authenticated user's organization
	 */
	async getAll(): Promise<Driver[]> {
		return apiClient.get<Driver[]>('/drivers');
	}

	/**
	 * Get a specific driver by ID
	 */
	async getById(driverId: string): Promise<Driver> {
		return apiClient.get<Driver>(`/drivers/${driverId}`);
	}

	/**
	 * Create a new driver
	 */
	async create(data: DriverCreate): Promise<Driver> {
		return apiClient.post<Driver>('/drivers', data);
	}

	/**
	 * Update a driver
	 */
	async update(driverId: string, data: DriverUpdate): Promise<Driver> {
		return apiClient.patch<Driver>(`/drivers/${driverId}`, data);
	}

	/**
	 * Delete a driver
	 */
	async delete(driverId: string): Promise<{ success: boolean }> {
		return apiClient.delete<{ success: boolean }>(`/drivers/${driverId}`);
	}
}

// Singleton instance
export const driverApi = new DriverApiService();
