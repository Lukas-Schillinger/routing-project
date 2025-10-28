import { db } from '$lib/server/db';
import { driverMapMemberships, drivers, locations, maps, stops } from '$lib/server/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import type { GeoApifyAgent, GeoApifyJob } from '../external/geoapify';
import { geoapifyOptimization } from '../external/geoapify';
import { ServiceError } from './errors';

/**
 * Options for route optimization
 */
export interface OptimizationOptions {
	/** Transportation mode: drive, walk, bicycle, truck */
	mode?: 'drive' | 'walk' | 'bicycle' | 'truck';
	/** Traffic consideration: free_flow or approximated */
	traffic?: 'free_flow' | 'approximated';
	/** Optimization goal: time or distance */
	optimize?: 'time' | 'distance';
	/** Depot location [longitude, latitude] */
	depotLocation?: [number, number];
	/** Default service time at each stop in seconds (default 300 = 5 minutes) */
	defaultServiceTime?: number;
}

/**
 * Optimization service for route planning
 * Wraps Geoapify optimization and manages database updates
 */
export class OptimizationService {
	/**
	 * Optimize routes for a map
	 * Assigns stops to drivers and determines optimal delivery order
	 */
	async optimizeMap(mapId: string, organizationId: string, options: OptimizationOptions = {}) {
		// Verify map ownership
		const [map] = await db.select().from(maps).where(eq(maps.id, mapId)).limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		if (map.organization_id !== organizationId) {
			throw ServiceError.forbidden('Access denied');
		}

		// Fetch stops with locations
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

		// Fetch assigned drivers
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

		// Determine depot location (use first stop if not provided)
		const depotLocation =
			options.depotLocation ||
			([Number(mapStops[0].location.lon), Number(mapStops[0].location.lat)] as [number, number]);

		// Convert to GeoApify format
		const agents: GeoApifyAgent[] = assignedDrivers.map(({ driver }) => ({
			id: driver.id,
			start_location: depotLocation
		}));

		const jobs: GeoApifyJob[] = mapStops.map(({ stop, location }) => {
			if (!location.lon || !location.lat) {
				throw ServiceError.validation(
					`Stop "${location.name || stop.id}" has no coordinates. Geocode all stops before optimizing.`
				);
			}

			return {
				id: stop.id,
				location: [Number(location.lon), Number(location.lat)],
				service: options.defaultServiceTime || 300 // 5 minutes default
			};
		});

		// Call Geoapify optimization
		const result = await geoapifyOptimization.optimize({
			agents,
			jobs,
			mode: options.mode || 'drive',
			traffic: options.traffic,
			optimize: options.optimize || 'time'
		});

		// Clear existing driver assignments
		await db
			.update(stops)
			.set({
				driver_id: null,
				delivery_index: null,
				updated_at: new Date()
			})
			.where(eq(stops.map_id, mapId));

		// Update stops with optimized routes
		const updatedStops = [];
		for (const feature of result.features) {
			const driverId = feature.properties.agent_id;
			let deliveryIndex = 0;

			for (const action of feature.properties.actions) {
				if (action.type === 'job' && action.job_id) {
					const [updatedStop] = await db
						.update(stops)
						.set({
							driver_id: driverId,
							delivery_index: deliveryIndex++,
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

		// Return optimized routes with location details
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
			features: result.features, // Include raw response for debugging/analysis
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
