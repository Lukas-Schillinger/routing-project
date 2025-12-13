import { z } from 'zod';

/**
 * TSP Solver API Types and Schemas
 * Matches the FastAPI endpoint schemas
 */

// Optimization configuration
export const optimizationConfigSchema = z.object({
	fairness: z.enum(['high', 'medium', 'low']).default('medium'),
	time_limit_sec: z.number().int().positive().default(10),
	start_at_depot: z.boolean().default(true), // Depot should be the first element in the matrix
	end_at_depot: z.boolean().default(false)
});

// Request payload
export const matrixPayloadSchema = z.object({
	matrix: z.array(z.array(z.number())),
	stop_ids: z.array(z.string()),
	vehicle_ids: z.array(z.string()),
	config: optimizationConfigSchema
});

// Response leg (individual stop in a route)
export const legSchema = z.object({
	stop_id: z.string(),
	stop_index: z.number().int()
});

// Response route (one driver's route)
export const routeSchema = z.object({
	driver_id: z.string(),
	cost: z.number().int(),
	legs: z.array(legSchema)
});

// Complete optimization result
export const optimizationResultSchema = z.object({
	job_id: z.string().uuid(),
	success: z.boolean(),
	routes: z.array(routeSchema),
	total_cost: z.number().int().nullable()
});

// Type exports
export type OptimizationConfig = z.infer<typeof optimizationConfigSchema>;
export type MatrixPayload = z.infer<typeof matrixPayloadSchema>;
export type Leg = z.infer<typeof legSchema>;
export type Route = z.infer<typeof routeSchema>;
export type OptimizationResult = z.infer<typeof optimizationResultSchema>;
