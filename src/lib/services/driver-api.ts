// Type definitions for Driver API requests and responses
// Uses Zod schemas for type safety

import type { Driver, DriverCreate, DriverUpdate } from '$lib/schemas/driver';

export type DeleteDriverResponse = {
	success: boolean;
	message: string;
};

/**
 * Fetch all drivers for the current organization
 */
export async function getDrivers(): Promise<Driver[]> {
	const response = await fetch('/api/drivers');
	if (!response.ok) {
		throw new Error(`Failed to fetch drivers: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Fetch a specific driver by ID
 */
export async function getDriver(driverId: string): Promise<Driver> {
	const response = await fetch(`/api/drivers/${driverId}`);
	if (!response.ok) {
		throw new Error(`Failed to fetch driver: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Create a new driver
 */
export async function createDriver(data: DriverCreate): Promise<Driver> {
	const response = await fetch('/api/drivers', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || 'Failed to create driver');
	}

	return response.json();
}

/**
 * Update an existing driver
 */
export async function updateDriver(driverId: string, data: DriverUpdate): Promise<Driver> {
	const response = await fetch(`/api/drivers/${driverId}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || 'Failed to update driver');
	}

	return response.json();
}

/**
 * Delete a driver (only if not assigned to routes)
 */
export async function deleteDriver(driverId: string): Promise<DeleteDriverResponse> {
	const response = await fetch(`/api/drivers/${driverId}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || 'Failed to delete driver');
	}

	return response.json();
}
