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

// Route schema (optimized route for one agent)
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

// Optimization response schema
export const geoapifyOptimizationResponseSchema = z.object({
	routes: z.array(geoapifyRouteSchema),
	unassigned: z.array(geoapifyUnassignedSchema).optional(),
	summary: z
		.object({
			total_distance: z.number(),
			total_duration: z.number(),
			total_service: z.number().optional(),
			total_waiting_time: z.number().optional(),
			computing_times: z
				.object({
					loading: z.number().optional(),
					solving: z.number().optional(),
					routing: z.number().optional()
				})
				.optional()
		})
		.optional()
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
