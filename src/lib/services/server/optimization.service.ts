import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, locations, maps, stops } from '$lib/server/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import type {
	GeoApifyAgent,
	GeoApifyJob,
	GeoApifyOptimizationResponse
} from '../external/geoapify';
import { geoapifyOptimization } from '../external/geoapify';
import { depotService } from './depot.service';
import { ServiceError } from './errors';

/**
 * Options for route optimization
 */
export interface OptimizationOptions {
	/** Required depot ID for route start/end location */
	depotId: string;
	/** Transportation mode: drive, walk, bicycle, truck */
	mode?: 'drive' | 'walk' | 'bicycle' | 'truck';
	/** Traffic consideration: free_flow or approximated */
	traffic?: 'free_flow' | 'approximated';
	/** Optimization goal: time or distance */
	optimize?: 'time' | 'distance';
	/** Default service time at each stop in seconds (default 300 = 5 minutes) */
	defaultServiceTime?: number;
}

/**
 * Optimization service for route planning
 * Wraps Geoapify optimization and manages database updates
 */
export class OptimizationService {
	/**
	 * Verify map exists and user has access
	 */
	private async verifyMapOwnership(mapId: string, organizationId: string) {
		const [map] = await db.select().from(maps).where(eq(maps.id, mapId)).limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		if (map.organization_id !== organizationId) {
			throw ServiceError.forbidden('Access denied');
		}

		return map;
	}

	/**
	 * Get depot location coordinates
	 */
	private async getDepotLocation(
		depotId: string,
		organizationId: string
	): Promise<[number, number]> {
		const depot = await depotService.getDepotById(depotId, organizationId);

		if (!depot.location.lon || !depot.location.lat) {
			throw ServiceError.validation(
				'Depot location has no coordinates. Please update the depot with valid coordinates.'
			);
		}

		return [Number(depot.location.lon), Number(depot.location.lat)];
	}

	/**
	 * Fetch stops with their locations for a map
	 */
	private async fetchMapStops(mapId: string) {
		const mapStops = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(eq(stops.map_id, mapId));

		if (mapStops.length === 0) {
			throw ServiceError.validation('No stops found for this map');
		}

		return mapStops;
	}

	/**
	 * Fetch active drivers assigned to a map
	 */
	private async fetchAssignedDrivers(mapId: string, organizationId: string) {
		const assignedDrivers = await db
			.select({
				driver: drivers
			})
			.from(driverMapMemberships)
			.innerJoin(drivers, eq(driverMapMemberships.driver_id, drivers.id))
			.where(
				and(
					eq(driverMapMemberships.map_id, mapId),
					eq(drivers.organization_id, organizationId),
					eq(drivers.active, true)
				)
			);

		if (assignedDrivers.length === 0) {
			throw ServiceError.validation(
				'No active drivers assigned to this map. Assign at least one driver before optimizing.'
			);
		}

		return assignedDrivers;
	}

	/**
	 * Convert drivers to Geoapify agent format
	 */
	private convertToAgents(
		assignedDrivers: Awaited<ReturnType<typeof this.fetchAssignedDrivers>>,
		depotLocation: [number, number]
	): GeoApifyAgent[] {
		return assignedDrivers.map(({ driver }) => ({
			id: driver.id,
			start_location: depotLocation
		}));
	}

	/**
	 * Convert stops to Geoapify job format
	 */
	private convertToJobs(
		mapStops: Awaited<ReturnType<typeof this.fetchMapStops>>,
		defaultServiceTime: number
	): GeoApifyJob[] {
		return mapStops.map(({ stop, location }) => {
			if (!location.lon || !location.lat) {
				throw ServiceError.validation(
					`Stop "${location.name || stop.id}" has no coordinates. Geocode all stops before optimizing.`
				);
			}

			return {
				id: stop.id,
				location: [Number(location.lon), Number(location.lat)],
				service: defaultServiceTime
			};
		});
	}

	/**
	 * Save optimization result to database
	 */
	private async saveOptimizationResult(mapId: string, result: GeoApifyOptimizationResponse) {
		await db
			.update(maps)
			.set({
				geoapifyOptimization: result
			})
			.where(eq(maps.id, mapId));
	}

	/**
	 * Clear existing driver assignments and delivery order
	 */
	private async clearStopAssignments(mapId: string) {
		await db
			.update(stops)
			.set({
				driver_id: null,
				delivery_index: null,
				updated_at: new Date()
			})
			.where(eq(stops.map_id, mapId));
	}

	/**
	 * Apply optimized routes to stops in database
	 */
	private async applyOptimizedRoutes(result: GeoApifyOptimizationResponse) {
		const updatedStops = [];

		for (const feature of result.features) {
			const driverId = feature.properties.agent_id;

			for (const action of feature.properties.actions) {
				if (action.type === 'job' && action.job_id) {
					// Waypoint array is ordered according to stop order. Job index is
					// the index of the job in the original array
					const deliveryIndex = action.waypoint_index ?? 0;

					const [updatedStop] = await db
						.update(stops)
						.set({
							driver_id: driverId,
							delivery_index: deliveryIndex,
							updated_at: new Date()
						})
						.where(eq(stops.id, action.job_id))
						.returning();

					if (updatedStop) {
						updatedStops.push(updatedStop);
					}
				}
			}
		}

		return updatedStops;
	}

	/**
	 * Optimize routes for a map
	 * Assigns stops to drivers and determines optimal delivery order
	 */
	async optimizeMap(mapId: string, organizationId: string, options: OptimizationOptions) {
		// Verify access
		await this.verifyMapOwnership(mapId, organizationId);

		// Gather required data
		const depotLocation = await this.getDepotLocation(options.depotId, organizationId);
		const mapStops = await this.fetchMapStops(mapId);
		const assignedDrivers = await this.fetchAssignedDrivers(mapId, organizationId);

		// Convert to Geoapify format
		const agents = this.convertToAgents(assignedDrivers, depotLocation);
		const jobs = this.convertToJobs(mapStops, options.defaultServiceTime || 300);

		// Call Geoapify optimization
		const result = await geoapifyOptimization.optimize({
			agents,
			jobs,
			mode: options.mode || 'drive',
			traffic: options.traffic,
			optimize: options.optimize || 'time'
		});

		// Save and apply optimization results
		await this.saveOptimizationResult(mapId, result);
		await this.clearStopAssignments(mapId);
		const updatedStops = await this.applyOptimizedRoutes(result);

		// Fetch and return optimized routes
		const optimizedStops = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(and(eq(stops.map_id, mapId), isNotNull(stops.driver_id)))
			.orderBy(stops.driver_id, stops.delivery_index);

		return {
			success: true,
			optimizedStops,
			stats: {
				totalStops: mapStops.length,
				assignedStops: updatedStops.length,
				drivers: assignedDrivers.length
			}
		};
	}

	/**
	 * Clear optimization results for a map
	 * Removes all driver assignments and delivery order
	 */
	async clearOptimization(mapId: string, organizationId: string) {
		// Verify map ownership
		const [map] = await db.select().from(maps).where(eq(maps.id, mapId)).limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		if (map.organization_id !== organizationId) {
			throw ServiceError.forbidden('Access denied');
		}

		await db
			.update(stops)
			.set({
				driver_id: null,
				delivery_index: null,
				updated_at: new Date()
			})
			.where(eq(stops.map_id, mapId));

		return { success: true };
	}
}

// Singleton instance
export const optimizationService = new OptimizationService();
