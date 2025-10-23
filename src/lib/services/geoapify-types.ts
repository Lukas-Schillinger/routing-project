import { z } from 'zod';

// GeoApify API error schema
export const geoapifyErrorSchema = z.object({
	message: z.string(),
	error: z.string().optional(),
	statusCode: z.number().optional()
});

// Coordinate schema [longitude, latitude]
export const geoapifyCoordinateSchema = z.tuple([z.number(), z.number()]);

// Location schema for waypoints
export const geoapifyLocationSchema = z.object({
	location: geoapifyCoordinateSchema,
	id: z.string().optional(),
	// For agents (vehicles/drivers)
	start_location: geoapifyCoordinateSchema.optional(),
	end_location: geoapifyCoordinateSchema.optional(),
	time_windows: z.array(z.tuple([z.number(), z.number()])).optional(), // [[start, end]] in seconds
	skills: z.array(z.string()).optional(),
	// For jobs (stops)
	service: z.number().optional(), // service duration in seconds
	delivery: z.array(z.number()).optional(), // delivery amounts
	pickup: z.array(z.number()).optional(), // pickup amounts
	priority: z.number().optional() // 0-100
});

// Agent (vehicle/driver) schema
export const geoapifyAgentSchema = z.object({
	id: z.string(),
	start_location: geoapifyCoordinateSchema.optional(),
	end_location: geoapifyCoordinateSchema.optional(),
	time_window: z.tuple([z.number(), z.number()]).optional(), // [start, end] in seconds
	capacity: z.array(z.number()).optional(), // vehicle capacities
	skills: z.array(z.string()).optional(),
	speed_factor: z.number().optional() // 0.5 to 2.0, default 1.0
});

// Job (stop) schema
export const geoapifyJobSchema = z.object({
	id: z.string(),
	location: geoapifyCoordinateSchema,
	service: z.number().optional(), // service duration in seconds
	delivery: z.array(z.number()).optional(),
	pickup: z.array(z.number()).optional(),
	skills: z.array(z.string()).optional(),
	priority: z.number().optional(), // 0-100
	time_windows: z.array(z.tuple([z.number(), z.number()])).optional() // [[start, end]] in seconds
});

// Route step schema (individual stop in optimized route)
export const geoapifyStepSchema = z.object({
	type: z.enum(['start', 'job', 'end']),
	id: z.string().optional(),
	location: geoapifyCoordinateSchema,
	arrival: z.number().optional(), // arrival time in seconds
	duration: z.number().optional(), // cumulative duration
	distance: z.number().optional(), // cumulative distance in meters
	load: z.array(z.number()).optional(), // current load
	service: z.number().optional(), // service time at this stop
	waiting_time: z.number().optional() // waiting time before service
});

// Action schema in the GeoJSON response
export const geoapifyActionSchema = z.object({
	index: z.number(),
	type: z.enum(['start', 'job', 'end', 'break']),
	start_time: z.number(),
	duration: z.number(),
	job_index: z.number().optional(),
	job_id: z.string().optional(),
	waypoint_index: z.number().optional() // optional because 'end' actions may not have this
});

// Waypoint schema in the GeoJSON response
export const geoapifyWaypointSchema = z.object({
	original_location: geoapifyCoordinateSchema,
	location: geoapifyCoordinateSchema,
	start_time: z.number(),
	duration: z.number(),
	actions: z.array(geoapifyActionSchema),
	prev_leg_index: z.number().optional(),
	next_leg_index: z.number().optional()
});

// Leg schema in the GeoJSON response
export const geoapifyLegSchema = z.object({
	time: z.number(),
	distance: z.number(),
	from_waypoint_index: z.number(),
	to_waypoint_index: z.number(),
	steps: z.array(
		z.object({
			from_index: z.number(),
			to_index: z.number(),
			time: z.number(),
			distance: z.number()
		})
	)
});

// Feature properties for each route in GeoJSON response
export const geoapifyFeaturePropertiesSchema = z.object({
	agent_index: z.number(),
	agent_id: z.string(),
	time: z.number(), // total duration in seconds
	start_time: z.number(),
	end_time: z.number(),
	distance: z.number(), // total distance in meters
	legs: z.array(geoapifyLegSchema),
	mode: z.string(),
	actions: z.array(geoapifyActionSchema),
	waypoints: z.array(geoapifyWaypointSchema),
	service: z.number().optional(),
	waiting_time: z.number().optional(),
	priority: z.number().optional(),
	delivery: z.array(z.number()).optional(),
	pickup: z.array(z.number()).optional()
});

// GeoJSON Feature for a route
export const geoapifyFeatureSchema = z.object({
	type: z.literal('Feature'),
	geometry: z.object({
		type: z.literal('MultiLineString'),
		coordinates: z.array(z.array(geoapifyCoordinateSchema))
	}),
	properties: geoapifyFeaturePropertiesSchema
});

// Route schema (optimized route for one agent) - simplified for internal use
export const geoapifyRouteSchema = z.object({
	agent_id: z.string(),
	steps: z.array(geoapifyStepSchema),
	distance: z.number(), // total distance in meters
	duration: z.number(), // total duration in seconds
	service: z.number().optional(), // total service time in seconds
	waiting_time: z.number().optional(), // total waiting time in seconds
	priority: z.number().optional(),
	delivery: z.array(z.number()).optional(),
	pickup: z.array(z.number()).optional()
});

// Unassigned job schema (jobs that couldn't be assigned)
export const geoapifyUnassignedSchema = z.object({
	id: z.string(),
	location: geoapifyCoordinateSchema,
	reason: z.string().optional()
});

// Optimization response schema - GeoJSON FeatureCollection format
export const geoapifyOptimizationResponseSchema = z.object({
	type: z.literal('FeatureCollection'),
	properties: z.object({
		mode: z.string(),
		params: z.object({
			agents: z.array(z.any()),
			jobs: z.array(z.any()),
			mode: z.string(),
			traffic: z.string().optional()
		})
	}),
	features: z.array(geoapifyFeatureSchema)
});

// Optimization request schema
export const geoapifyOptimizationRequestSchema = z.object({
	agents: z.array(geoapifyAgentSchema),
	jobs: z.array(geoapifyJobSchema),
	mode: z.enum(['drive', 'walk', 'bicycle', 'truck']).optional().default('drive'),
	traffic: z.enum(['free_flow', 'approximated']).optional(),
	optimize: z.enum(['time', 'distance']).optional().default('time')
});

// Type exports
export type GeoApifyError = z.infer<typeof geoapifyErrorSchema>;
export type GeoApifyCoordinate = z.infer<typeof geoapifyCoordinateSchema>;
export type GeoApifyLocation = z.infer<typeof geoapifyLocationSchema>;
export type GeoApifyAgent = z.infer<typeof geoapifyAgentSchema>;
export type GeoApifyJob = z.infer<typeof geoapifyJobSchema>;
export type GeoApifyStep = z.infer<typeof geoapifyStepSchema>;
export type GeoApifyRoute = z.infer<typeof geoapifyRouteSchema>;
export type GeoApifyUnassigned = z.infer<typeof geoapifyUnassignedSchema>;
export type GeoApifyOptimizationResponse = z.infer<typeof geoapifyOptimizationResponseSchema>;
export type GeoApifyOptimizationRequest = z.infer<typeof geoapifyOptimizationRequestSchema>;
