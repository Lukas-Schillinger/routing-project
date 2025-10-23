// Type definitions for Driver API requests and responses
// Uses Zod schemas for type safety

import type { Driver, DriverCreate, DriverUpdate } from '$lib/schemas/driver';

export type DeleteDriverResponse = {
	success: boolean;
	message: string;
};

export type DriverMapMembershipResponse = {
	id: string;
	organization_id: string;
	driver_id: string;
	map_id: string;
	created_at: Date;
	updated_at: Date;
};

export type MapDriverMembership = DriverMapMembershipResponse & {
	driver: {
		id: string;
		name: string;
		phone: string | null;
		notes: string | null;
		active: boolean;
		temporary: boolean;
	};
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

/**
 * Assign a driver to a map
 */
export async function assignDriverToMap(
	mapId: string,
	driverId: string
): Promise<DriverMapMembershipResponse> {
	const response = await fetch(`/api/maps/${mapId}/driver-memberships`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ driver_id: driverId })
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || 'Failed to assign driver to map');
	}

	return response.json();
}

/**
 * Remove a driver from a map
 */
export async function removeDriverFromMap(
	mapId: string,
	driverId: string
): Promise<DeleteDriverResponse> {
	const response = await fetch(`/api/maps/${mapId}/driver-memberships/${driverId}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || 'Failed to remove driver from map');
	}

	return response.json();
}

/**
 * Get all drivers assigned to a map
 */
export async function getMapDrivers(mapId: string): Promise<MapDriverMembership[]> {
	const response = await fetch(`/api/maps/${mapId}/driver-memberships`);

	if (!response.ok) {
		throw new Error(`Failed to fetch map drivers: ${response.statusText}`);
	}

	return response.json();
}
