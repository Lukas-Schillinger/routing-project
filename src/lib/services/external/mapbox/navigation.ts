import { mapboxClient } from './client';
import {
	directionsResponseGeoJsonSchema,
	type Coordinate,
	type DirectionsResponseGeoJson
} from './types';

/**
 * Mapbox Navigation Service
 * Provides route navigation using Mapbox Directions API
 */
class MapboxNavigationService {
	/**
	 * Get directions for a list of locations
	 *
	 * @param locations - Array of coordinates [longitude, latitude] to navigate through
	 * @returns Directions API response with routes and waypoints (GeoJSON format)
	 */
	async getDirections(locations: Coordinate[]): Promise<DirectionsResponseGeoJson> {
		if (locations.length < 2) {
			throw new Error('At least 2 locations are required for directions');
		}

		if (locations.length > 25) {
			throw new Error('Maximum 25 locations allowed for directions');
		}

		// Format coordinates as "lon,lat;lon,lat;..."
		const coordinatesString = locations.map((coord) => `${coord[0]},${coord[1]}`).join(';');

		// Build API endpoint
		// Using driving profile with geometries in geojson format
		const endpoint = `/directions/v5/mapbox/driving/${coordinatesString}`;

		// Query parameters
		const params = new URLSearchParams({
			geometries: 'geojson',
			steps: 'true',
			overview: 'full'
		});

		// Make API request
		const response = await mapboxClient.get<DirectionsResponseGeoJson>(
			`${endpoint}?${params.toString()}`
		);

		// Validate response with GeoJSON-specific schema
		const validatedResponse = directionsResponseGeoJsonSchema.parse(response);

		// Check for API errors
		if (validatedResponse.code !== 'Ok') {
			throw new Error(
				`Mapbox Directions API error: ${validatedResponse.message || validatedResponse.code}`
			);
		}

		return validatedResponse;
	}
}

// Singleton instance
export const mapboxNavigation = new MapboxNavigationService();
