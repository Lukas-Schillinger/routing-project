import { geoapifyClient } from './client';
import {
	geoapifyOptimizationResponseSchema,
	type GeoApifyOptimizationRequest,
	type GeoApifyOptimizationResponse
} from './types';

/**
 * Geoapify optimization service for route planning
 * @see https://apidocs.geoapify.com/docs/route-planner/
 */
export class GeoapifyOptimizationService {
	/**
	 * Optimize routes using Geoapify Route Planner API
	 */
	async optimize(request: GeoApifyOptimizationRequest): Promise<GeoApifyOptimizationResponse> {
		const response = await geoapifyClient.post<unknown>('/routeplanner', request);
		return geoapifyOptimizationResponseSchema.parse(response);
	}
}

// Singleton instance
export const geoapifyOptimization = new GeoapifyOptimizationService();
