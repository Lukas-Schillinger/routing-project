import type { Driver } from '$lib/schemas/driver.js';
import { db } from '$lib/server/db/index.js';
import { drivers, locations, stops } from '$lib/server/db/schema.js';
import { and, eq, isNotNull } from 'drizzle-orm';
import { geoapifyClient, type GeoApifyApiClient } from './geoapify-client.js';
import {
	geoapifyOptimizationRequestSchema,
	geoapifyOptimizationResponseSchema,
	type GeoApifyAgent,
	type GeoApifyJob,
	type GeoApifyOptimizationRequest,
	type GeoApifyOptimizationResponse
} from './geoapify-types.js';

/**
 * Depot configuration for driver start/end locations
 */
export interface DepotConfig {
	/** Depot location [longitude, latitude] */
	location: [number, number];
	/** Where drivers should end their routes */
	endBehavior: 'depot' | 'driver-address' | 'last-stop';
}

/**
 * Driver configuration options
 */
export interface DriverConfig {
	/** Home/base location for the driver [longitude, latitude] */
	homeLocation?: [number, number];
	/** Time window for driver availability [start, end] in seconds since midnight */
	timeWindow?: [number, number];
	/** Vehicle capacity constraints (e.g., [weight, volume, packages]) */
	capacity?: number[];
	/** Driver skills (e.g., ['refrigerated', 'hazmat']) */
	skills?: string[];
	/** Speed factor (0.5 to 2.0, default 1.0) */
	speedFactor?: number;
}

/**
 * Stop configuration options
 */
export interface StopConfig {
	/** Service time at stop in seconds (default 300 = 5 minutes) */
	serviceTime?: number;
	/** Delivery amounts for capacity tracking */
	delivery?: number[];
	/** Pickup amounts for capacity tracking */
	pickup?: number[];
	/** Required driver skills for this stop */
	skills?: string[];
	/** Stop priority (0-100, higher = more important) */
	priority?: number;
	/** Time windows when stop can be visited [[start, end]] in seconds */
	timeWindows?: [number, number][];
}

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
	/** Depot configuration (if drivers should start/end at a central location) */
	depot?: DepotConfig;
	/** Per-driver configuration options */
	driverConfig?: Record<string, DriverConfig>;
	/** Global driver configuration (applied to all drivers if not overridden) */
	globalDriverConfig?: DriverConfig;
	/** Per-stop configuration options */
	stopConfig?: Record<string, StopConfig>;
	/** Global stop configuration (applied to all stops if not overridden) */
	globalStopConfig?: StopConfig;
}

/**
 * GeoApify Route Optimization Service
 *
 * Provides route optimization using the GeoApify Route Planner API for solving
 * Vehicle Routing Problems (VRP) with multiple drivers and stops.
 *
 * Features: time windows, capacity constraints, service time, skills matching,
 * priority-based assignment, and pickup/delivery constraints.
 */
export class GeoApifyOptimizationService {
	constructor(private client: GeoApifyApiClient = geoapifyClient) {}

	/**
	 * Optimize routes for a map by creating routes for all drivers and stops
	 *
	 * Workflow:
	 * 1. Query database for map, drivers, and stops
	 * 2. Transform to GeoApify format (agents and jobs)
	 * 3. Call optimization API
	 * 4. Update stops with driver assignments and delivery indices
	 * 5. Return updated stops
	 */
	async optimizeWithDrivers(
		mapId: string,
		options: OptimizationOptions = {}
	): Promise<Array<typeof stops.$inferSelect>> {
		// Fetch stops for this map
		const stopsData = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(eq(stops.map_id, mapId));

		if (stopsData.length === 0) {
			throw new Error('No stops found for this map');
		}

		// Fetch drivers assigned to this map
		const driversData = await db
			.select({
				driver: drivers
			})
			.from(stops)
			.innerJoin(drivers, eq(stops.driver_id, drivers.id))
			.where(and(eq(stops.map_id, mapId), isNotNull(stops.driver_id)))
			.groupBy(drivers.id);

		if (driversData.length === 0) {
			throw new Error('No drivers assigned to this map. At least one driver must be assigned.');
		}

		// Convert stops to jobs
		const jobs: GeoApifyJob[] = stopsData.map((s) => this.stopToJob(s, options));

		// Create agents from drivers
		const agents: GeoApifyAgent[] = driversData.map((d) => {
			const firstStopLat = stopsData[0].location.lat ? parseFloat(stopsData[0].location.lat) : 0;
			const firstStopLon = stopsData[0].location.lon ? parseFloat(stopsData[0].location.lon) : 0;

			return {
				id: d.driver.id,
				start_location: options.depot?.location || [firstStopLon, firstStopLat],
				end_location: this.getEndLocation(options.depot, options.driverConfig?.[d.driver.id] || {}),
				...options.driverConfig?.[d.driver.id],
				...options.globalDriverConfig
			};
		});

		// Call GeoApify optimization
		const response = await this.optimizeRoutes(agents, jobs, options);

		// Transform response
		const optimizedRoutes = response.features.map((feature) => ({
			driver_id: feature.properties.agent_id,
			stops: feature.properties.actions
				.filter((action) => action.type === 'job' && action.waypoint_index !== undefined)
				.map((action, index) => ({
					stop_id: action.job_id!,
					delivery_index: index
				}))
		}));

		// Update stops with driver assignments and delivery order
		const updatedStops: Array<typeof stops.$inferSelect> = [];
		for (const route of optimizedRoutes) {
			for (const stop of route.stops) {
				const [updatedStop] = await db
					.update(stops)
					.set({
						driver_id: route.driver_id,
						delivery_index: stop.delivery_index,
						updated_at: new Date()
					})
					.where(eq(stops.id, stop.stop_id))
					.returning();

				if (updatedStop) {
					updatedStops.push(updatedStop);
				}
			}
		}

		return updatedStops;
	}

	/**
	 * Transform a Driver to a GeoApify Agent
	 */
	private driverToAgent(driver: Driver, options: OptimizationOptions): GeoApifyAgent {
		const config = options.driverConfig?.[driver.id] || options.globalDriverConfig || {};
		const { depot } = options;

		const startLocation = this.getStartLocation(depot, config, driver);
		const endLocation = this.getEndLocation(depot, config);

		return {
			id: driver.id,
			start_location: startLocation,
			end_location: endLocation,
			time_window: config.timeWindow,
			capacity: config.capacity,
			skills: config.skills,
			speed_factor: config.speedFactor
		};
	}

	private getStartLocation(
		depot: DepotConfig | undefined,
		config: DriverConfig,
		driver: Driver
	): [number, number] {
		if (depot) return depot.location;
		if (config.homeLocation) return config.homeLocation;
		throw new Error(
			`Driver ${driver.name} (${driver.id}) has no start location. Configure depot or driverConfig.`
		);
	}

	private getEndLocation(
		depot: DepotConfig | undefined,
		config: DriverConfig
	): [number, number] | undefined {
		if (!depot) return config.homeLocation;

		switch (depot.endBehavior) {
			case 'depot':
				return depot.location;
			case 'driver-address':
				return config.homeLocation || depot.location;
			case 'last-stop':
				return undefined;
		}
	}

	/**
	 * Transform a Stop to a GeoApify Job
	 */
	private stopToJob(
		stop: {
			stop: { id: string };
			location: { lat: string | null; lon: string | null; name: string | null };
		},
		options: OptimizationOptions
	): GeoApifyJob {
		const config = options.stopConfig?.[stop.stop.id] || options.globalStopConfig || {};

		const lat = stop.location.lat ? parseFloat(stop.location.lat) : null;
		const lon = stop.location.lon ? parseFloat(stop.location.lon) : null;

		if (!lat || !lon) {
			throw new Error(
				`Stop ${stop.location.name || stop.stop.id} has no coordinates. Ensure all locations are geocoded.`
			);
		}

		return {
			id: stop.stop.id,
			location: [lon, lat],
			service: config.serviceTime,
			delivery: config.delivery,
			pickup: config.pickup,
			skills: config.skills,
			priority: config.priority,
			time_windows: config.timeWindows
		};
	}

	/**
	 * Optimize routes for multiple agents and jobs
	 */
	async optimizeRoutes(
		agents: GeoApifyAgent[],
		jobs: GeoApifyJob[],
		options: OptimizationOptions = {}
	): Promise<GeoApifyOptimizationResponse> {
		if (agents.length === 0) {
			throw new Error('At least one agent (driver) is required for optimization');
		}
		if (jobs.length === 0) {
			throw new Error('At least one job (stop) is required for optimization');
		}

		const request: GeoApifyOptimizationRequest = {
			agents,
			jobs,
			mode: options.mode || 'drive',
			traffic: options.traffic,
			optimize: options.optimize || 'time'
		};

		console.log('Optimization request:', JSON.stringify(request, null, 2));

		const validatedRequest = geoapifyOptimizationRequestSchema.parse(request);

		let response: unknown;
		try {
			response = await this.client.request<unknown>('/v1/routeplanner', {
				method: 'POST',
				body: JSON.stringify(validatedRequest)
			});
		} catch (error) {
			console.error('GeoApify API request failed:', error);
			if (error instanceof Error) {
				throw new Error(`GeoApify API error: ${error.message}`);
			}
			throw error;
		}

		console.log('GeoApify API response:', JSON.stringify(response, null, 2));

		try {
			return geoapifyOptimizationResponseSchema.parse(response);
		} catch (error) {
			console.error('Failed to parse GeoApify response:', error);
			console.error('Raw response:', JSON.stringify(response, null, 2));

			// Check if the response is an error object
			const responseObj = response as Record<string, unknown>;
			if (responseObj?.message || responseObj?.error) {
				throw new Error(`GeoApify returned an error: ${responseObj.message || responseObj.error}`);
			}

			throw new Error(
				`Invalid response from GeoApify API: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}
}

/**
 * Default optimization service instance
 */
export const optimizationService = new GeoApifyOptimizationService();
