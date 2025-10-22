// Service for managing routes (driver assignments to maps)

export type Route = {
	id: string;
	organization_id: string;
	map_id: string;
	driver_id: string | null;
	total_distance_m: number;
	total_duration_s: number;
	created_at: Date;
	updated_at: Date;
};

export type CreateRouteRequest = {
	driver_id: string;
};

export type DeleteRouteResponse = {
	success: boolean;
	message: string;
};

/**
 * Fetch all routes for a specific map
 */
export async function getMapRoutes(mapId: string): Promise<Route[]> {
	const response = await fetch(`/api/maps/${mapId}/routes`);
	if (!response.ok) {
		throw new Error(`Failed to fetch routes: ${response.statusText}`);
	}
	return response.json();
}

/**
 * Create a new route (assign driver to map)
 */
export async function createRoute(mapId: string, data: CreateRouteRequest): Promise<Route> {
	const response = await fetch(`/api/maps/${mapId}/routes`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || 'Failed to create route');
	}

	return response.json();
}

/**
 * Delete a route (unassign driver from map)
 */
export async function deleteRoute(mapId: string, routeId: string): Promise<DeleteRouteResponse> {
	const response = await fetch(`/api/maps/${mapId}/routes/${routeId}`, {
		method: 'DELETE'
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: response.statusText }));
		throw new Error(error.message || 'Failed to delete route');
	}

	return response.json();
}

/**
 * Assign an existing driver to a map
 */
export async function assignDriverToMap(mapId: string, driverId: string): Promise<Route> {
	return createRoute(mapId, { driver_id: driverId });
}

/**
 * Remove a driver from a map
 */
export async function removeDriverFromMap(
	mapId: string,
	routeId: string
): Promise<DeleteRouteResponse> {
	return deleteRoute(mapId, routeId);
}
