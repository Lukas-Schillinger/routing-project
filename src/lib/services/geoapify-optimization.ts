import type { Driver } from '$lib/schemas/driver.js';
import type { RouteStopCreate } from '$lib/schemas/routeStop.js';
import type { StopWithLocation } from '$lib/schemas/stop.js';
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
 * Waypoint for map visualization
 */
export interface Waypoint {
	/** Coordinates [longitude, latitude] */
	location: [number, number];
	/** Type of waypoint */
	type: 'start' | 'stop' | 'end';
	/** Stop ID if this is a delivery stop */
	stopId?: string;
	/** Arrival time in seconds since start of route */
	arrival?: number;
	/** Service/waiting time in seconds */
	service?: number;
}

/**
 * Optimized route result for a single driver
 */
export interface OptimizedDriverRoute {
	/** Driver ID from database */
	driverId: string;
	/** Ordered list of stops ready to insert into route_stops table */
	routeStops: Omit<RouteStopCreate, 'route_id' | 'organization_id'>[];
	/** All waypoints for map visualization (includes start/end) */
	waypoints: Waypoint[];
	/** Total route distance in meters */
	totalDistance: number;
	/** Total route duration in seconds */
	totalDuration: number;
	/** Total service time in seconds */
	totalServiceTime: number;
}

/**
 * Complete optimization result
 */
export interface OptimizationResult {
	/** Optimized routes for each driver */
	routes: OptimizedDriverRoute[];
	/** Stops that couldn't be assigned */
	unassigned: Array<{
		stopId: string;
		reason?: string;
		location: [number, number];
	}>;
	/** Summary statistics */
	summary: {
		totalDistance: number;
		totalDuration: number;
		totalServiceTime: number;
		totalStops: number;
		totalDrivers: number;
	};
}

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
 * This service provides route optimization capabilities using the GeoApify Route Planner API.
 * It can solve Vehicle Routing Problems (VRP) with multiple drivers/vehicles and stops.
 *
 * Features:
 * - Multi-vehicle route optimization
 * - Time windows for drivers and stops
 * - Capacity constraints (weight, volume, etc.)
 * - Service time at each stop
 * - Skills matching (driver skills required for specific stops)
 * - Priority-based stop assignment
 * - Pickup and delivery constraints
 */
export class GeoApifyOptimizationService {
	constructor(private client: GeoApifyApiClient = geoapifyClient) {}

	/**
	 * Optimize routes using app's Driver and Stop models
	 * This is the main method to use when integrating with your database
	 *
	 * @param drivers - Array of drivers from your database
	 * @param stops - Array of stops with location data
	 * @param options - Optimization configuration
	 * @returns Optimized routes with driver IDs matching your database
	 *
	 * @example
	 * ```typescript
	 * const drivers = await db.select().from(drivers).where(eq(routes.map_id, mapId));
	 * const stops = await db.select()
	 *   .from(stops)
	 *   .innerJoin(locations, eq(stops.location_id, locations.id))
	 *   .where(eq(stops.map_id, mapId));
	 *
	 * const result = await optimizationService.optimizeWithDrivers(drivers, stops, {
	 *   mode: 'drive',
	 *   optimize: 'time',
	 *   depot: {
	 *     location: [-122.4194, 37.7749],
	 *     endBehavior: 'depot' // drivers return to depot
	 *   },
	 *   globalStopConfig: {
	 *     serviceTime: 300 // 5 minutes per stop
	 *   }
	 * });
	 * ```
	 */
	async optimizeWithDrivers(
		drivers: Driver[],
		stops: StopWithLocation[],
		options: OptimizationOptions = {}
	): Promise<OptimizationResult> {
		// Transform drivers to agents
		const agents = drivers.map((driver) => this.driverToAgent(driver, options));

		// Transform stops to jobs
		const jobs = stops.map((stop) => this.stopToJob(stop, options));

		// Call the underlying API
		const apiResponse = await this.optimizeRoutes(agents, jobs, options);

		// Transform API response to our structured format
		return this.transformToOptimizationResult(apiResponse);
	}

	/**
	 * Transform GeoApify API response to our structured format
	 */
	private transformToOptimizationResult(
		apiResponse: GeoApifyOptimizationResponse
	): OptimizationResult {
		const routes: OptimizedDriverRoute[] = apiResponse.routes.map((route) => {
			// Extract stops (exclude start/end depot steps)
			const stopSteps = route.steps.filter((step) => step.type === 'job');

			// Build route stops - ready to insert into route_stops table
			// (caller will add route_id and organization_id)
			const routeStops: Omit<RouteStopCreate, 'route_id' | 'organization_id'>[] = stopSteps.map(
				(step, index) => ({
					stop_id: step.id!,
					sequence: index + 1
				})
			);

			// Build waypoints for map visualization
			const waypoints: Waypoint[] = route.steps.map((step) => ({
				location: step.location,
				type: step.type === 'start' ? 'start' : step.type === 'end' ? 'end' : 'stop',
				stopId: step.type === 'job' ? step.id : undefined,
				arrival: step.arrival,
				service: step.service
			}));

			return {
				driverId: route.agent_id,
				routeStops,
				waypoints,
				totalDistance: route.distance,
				totalDuration: route.duration,
				totalServiceTime: route.service || 0
			};
		});

		// Transform unassigned stops
		const unassigned =
			apiResponse.unassigned?.map((u) => ({
				stopId: u.id,
				reason: u.reason,
				location: u.location
			})) || [];

		// Calculate summary
		const totalStops = routes.reduce((sum, route) => sum + route.routeStops.length, 0);
		const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);
		const totalDuration = routes.reduce((sum, route) => sum + route.totalDuration, 0);
		const totalServiceTime = routes.reduce((sum, route) => sum + route.totalServiceTime, 0);

		return {
			routes,
			unassigned,
			summary: {
				totalDistance,
				totalDuration,
				totalServiceTime,
				totalStops,
				totalDrivers: routes.length
			}
		};
	}

	/**
	 * Transform a Driver to a GeoApify Agent
	 */
	private driverToAgent(driver: Driver, options: OptimizationOptions): GeoApifyAgent {
		const driverConfig = options.driverConfig?.[driver.id] || options.globalDriverConfig || {};
		const depot = options.depot;

		// Determine start location
		let startLocation: [number, number];
		if (depot) {
			// Use depot as start location
			startLocation = depot.location;
		} else if (driverConfig.homeLocation) {
			// Use driver's home location
			startLocation = driverConfig.homeLocation;
		} else {
			// Default to a placeholder (should be configured by user)
			throw new Error(
				`Driver ${driver.name} (${driver.id}) has no start location. Configure depot or driverConfig.`
			);
		}

		// Determine end location
		let endLocation: [number, number] | undefined;
		if (depot) {
			switch (depot.endBehavior) {
				case 'depot':
					endLocation = depot.location;
					break;
				case 'driver-address':
					endLocation = driverConfig.homeLocation || depot.location;
					break;
				case 'last-stop':
					endLocation = undefined; // Let driver end at last stop
					break;
			}
		} else if (driverConfig.homeLocation) {
			// If no depot, default to returning to home
			endLocation = driverConfig.homeLocation;
		}

		return {
			id: driver.id, // Use database driver ID
			start_location: startLocation,
			end_location: endLocation,
			time_window: driverConfig.timeWindow,
			capacity: driverConfig.capacity,
			skills: driverConfig.skills,
			speed_factor: driverConfig.speedFactor
		};
	}

	/**
	 * Transform a Stop to a GeoApify Job
	 */
	private stopToJob(stop: StopWithLocation, options: OptimizationOptions): GeoApifyJob {
		const stopConfig = options.stopConfig?.[stop.stop.id] || options.globalStopConfig || {};

		// Get coordinates
		const lat = stop.location.lat ? parseFloat(stop.location.lat) : null;
		const lon = stop.location.lon ? parseFloat(stop.location.lon) : null;

		if (!lat || !lon) {
			throw new Error(
				`Stop ${stop.location.name || stop.stop.id} has no coordinates. Ensure all locations are geocoded.`
			);
		}

		return {
			id: stop.stop.id, // Use database stop ID
			location: [lon, lat], // GeoJSON format: [longitude, latitude]
			service: stopConfig.serviceTime,
			delivery: stopConfig.delivery,
			pickup: stopConfig.pickup,
			skills: stopConfig.skills,
			priority: stopConfig.priority,
			time_windows: stopConfig.timeWindows
		};
	}

	/**
	 * Optimize routes for multiple agents (drivers/vehicles) and jobs (stops)
	 *
	 * @param agents - Array of agents (drivers/vehicles) with their constraints
	 * @param jobs - Array of jobs (stops/deliveries) to be assigned
	 * @param options - Additional optimization options
	 * @returns Optimized routes for each agent
	 *
	 * @example
	 * ```typescript
	 * const agents = [{
	 *   id: 'driver-1',
	 *   start_location: [-122.4194, 37.7749], // San Francisco
	 *   end_location: [-122.4194, 37.7749],
	 *   time_window: [28800, 64800], // 8am to 6pm in seconds
	 *   capacity: [100] // can carry 100 units
	 * }];
	 *
	 * const jobs = [{
	 *   id: 'stop-1',
	 *   location: [-122.4084, 37.7849],
	 *   service: 300, // 5 minutes
	 *   delivery: [10] // deliver 10 units
	 * }];
	 *
	 * const result = await service.optimizeRoutes(agents, jobs, {
	 *   mode: 'drive',
	 *   optimize: 'time'
	 * });
	 * ```
	 */
	async optimizeRoutes(
		agents: GeoApifyAgent[],
		jobs: GeoApifyJob[],
		options: OptimizationOptions = {}
	): Promise<GeoApifyOptimizationResponse> {
		// Validate and build request
		const request: GeoApifyOptimizationRequest = {
			agents,
			jobs,
			mode: options.mode || 'drive',
			traffic: options.traffic,
			optimize: options.optimize || 'time'
		};

		// Validate request schema
		const validatedRequest = geoapifyOptimizationRequestSchema.parse(request);

		// Make API request
		const endpoint = '/v1/routeplanner';
		const response = await this.client.request<unknown>(endpoint, {
			method: 'POST',
			body: JSON.stringify(validatedRequest)
		});

		// Validate and return response
		return geoapifyOptimizationResponseSchema.parse(response);
	}
}

/**
 * Default optimization service instance
 */
export const optimizationService = new GeoApifyOptimizationService();
