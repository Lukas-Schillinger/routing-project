import { z } from 'zod';

// Mapbox API response schemas
export const mapboxErrorSchema = z.object({
	message: z.string(),
	code: z.string().optional()
});

export const coordinateSchema = z.tuple([z.number(), z.number()]); // [longitude, latitude]

export const mapboxFeatureSchema = z.object({
	type: z.literal('Feature'),
	geometry: z.object({
		type: z.string(),
		coordinates: z.union([coordinateSchema, z.array(coordinateSchema)])
	}),
	properties: z.record(z.string(), z.unknown())
});

export const mapboxResponseSchema = z.object({
	type: z.literal('FeatureCollection'),
	features: z.array(mapboxFeatureSchema),
	attribution: z.string().optional()
});

// Type exports
export type MapboxError = z.infer<typeof mapboxErrorSchema>;
export type Coordinate = z.infer<typeof coordinateSchema>;
export type MapboxFeature = z.infer<typeof mapboxFeatureSchema>;
export type MapboxResponse = z.infer<typeof mapboxResponseSchema>;
