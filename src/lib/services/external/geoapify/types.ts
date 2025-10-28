import { z } from 'zod';

// GeoApify API error schema
export const geoapifyErrorSchema = z.object({
	message: z.string(),
	error: z.string().optional(),
	statusCode: z.number().optional()
});

// Coordinate schema [longitude, latitude]
export const geoapifyCoordinateSchema = z.tuple([z.number(), z.number()]);

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

// Action schema in the GeoJSON response
export const geoapifyActionSchema = z.object({
	index: z.number(),
	type: z.enum(['start', 'job', 'end', 'break']),
	start_time: z.number(),
	duration: z.number(),
	job_index: z.number().optional(),
	job_id: z.string().optional(),
	waypoint_index: z.number().optional()
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

// Optimization response schema - GeoJSON FeatureCollection format
export const geoapifyOptimizationResponseSchema = z.object({
	type: z.literal('FeatureCollection'),
	properties: z.object({
		mode: z.string(),
		params: z.object({
			agents: z.array(z.unknown()),
			jobs: z.array(z.unknown()),
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
export type GeoApifyAgent = z.infer<typeof geoapifyAgentSchema>;
export type GeoApifyJob = z.infer<typeof geoapifyJobSchema>;
export type GeoApifyAction = z.infer<typeof geoapifyActionSchema>;
export type GeoApifyWaypoint = z.infer<typeof geoapifyWaypointSchema>;
export type GeoApifyLeg = z.infer<typeof geoapifyLegSchema>;
export type GeoApifyFeatureProperties = z.infer<typeof geoapifyFeaturePropertiesSchema>;
export type GeoApifyFeature = z.infer<typeof geoapifyFeatureSchema>;
export type GeoApifyOptimizationResponse = z.infer<typeof geoapifyOptimizationResponseSchema>;
export type GeoApifyOptimizationRequest = z.infer<typeof geoapifyOptimizationRequestSchema>;
