import { z } from 'zod';

// Mapbox API response schemas
export const mapboxErrorSchema = z.object({
	message: z.string(),
	code: z.string().optional()
});

export const coordinateSchema = z.tuple([z.number(), z.number()]); // [longitude, latitude]

// Context sub-objects in v6
const contextSubObjectSchema = z.object({
	mapbox_id: z.string(),
	name: z.string(),
	wikidata_id: z.string().optional(),
	short_code: z.string().optional()
});

const addressContextSchema = contextSubObjectSchema.extend({
	address_number: z.string().optional(),
	street_name: z.string().optional()
});

const regionContextSchema = contextSubObjectSchema.extend({
	region_code: z.string().optional(),
	region_code_full: z.string().optional()
});

const countryContextSchema = contextSubObjectSchema.extend({
	country_code: z.string(),
	country_code_alpha_3: z.string()
});

const featureContextSchema = z.object({
	address: addressContextSchema.optional(),
	street: contextSubObjectSchema.optional(),
	neighborhood: contextSubObjectSchema.optional(),
	postcode: contextSubObjectSchema.optional(),
	locality: contextSubObjectSchema.optional(),
	place: contextSubObjectSchema.optional(),
	district: contextSubObjectSchema.optional(),
	region: regionContextSchema.optional(),
	country: countryContextSchema.optional()
});

// Main feature schema for v6
export const geocodingFeatureSchema = z.object({
	id: z.string(),
	type: z.literal('Feature'),
	geometry: z.object({
		type: z.literal('Point'),
		coordinates: coordinateSchema
	}),
	properties: z.object({
		mapbox_id: z.string(),
		feature_type: z.string(),
		name: z.string(),
		name_preferred: z.string().optional(),
		place_formatted: z.string().optional(),
		full_address: z.string().optional(),
		context: featureContextSchema.optional(),
		coordinates: z
			.object({
				longitude: z.number(),
				latitude: z.number(),
				accuracy: z.string().optional(),
				routable_points: z.array(z.any()).optional()
			})
			.optional(),
		bbox: z.array(z.number()).optional(),
		match_code: z.record(z.string(), z.string()).optional()
	})
});

export const geocodingResponseSchema = z.object({
	type: z.literal('FeatureCollection'),
	features: z.array(geocodingFeatureSchema),
	attribution: z.string()
});

export const batchGeocodingResponseSchema = z.object({
	batch: z.array(geocodingResponseSchema)
});

// Distance Matrix API schemas
export const matrixWaypointSchema = z.object({
	name: z.string(),
	location: coordinateSchema,
	distance: z.number() // Distance in meters from the input coordinate to the snapped coordinate
});

export const matrixResponseSchema = z.object({
	code: z.string(), // "Ok" on success, or error code
	durations: z.array(z.array(z.number())).optional(), // Travel times in seconds (row-major order)
	sources: z.array(matrixWaypointSchema), // Snapped source waypoints
	destinations: z.array(matrixWaypointSchema), // Snapped destination waypoints
	message: z.string().optional() // Error message if code is not "Ok"
});

// Directions API schemas
export const directionsWaypointSchema = z.object({
	name: z.string(),
	location: coordinateSchema,
	distance: z.number() // Distance in meters from the input coordinate to the snapped coordinate
});

export const directionsStepSchema = z.object({
	distance: z.number(),
	duration: z.number(),
	geometry: z.union([z.string(), z.object({}).passthrough()]), // Encoded polyline string or GeoJSON
	name: z.string().optional(),
	mode: z.string().optional(),
	maneuver: z
		.object({
			type: z.string(),
			instruction: z.string(),
			location: coordinateSchema
		})
		.optional()
});

// GeoJSON-specific step schema (when geometries=geojson)
export const directionsStepGeoJsonSchema = z.object({
	distance: z.number(),
	duration: z.number(),
	geometry: z.object({}).passthrough(), // GeoJSON LineString (passthrough to allow any GeoJSON properties)
	name: z.string().optional(),
	mode: z.string().optional(),
	maneuver: z
		.object({
			type: z.string(),
			instruction: z.string(),
			location: coordinateSchema
		})
		.optional()
});

export const directionsLegSchema = z.object({
	distance: z.number(), // Distance in meters
	duration: z.number(), // Duration in seconds
	steps: z.array(directionsStepSchema).optional(),
	summary: z.string().optional()
});

// GeoJSON-specific leg schema (when geometries=geojson)
export const directionsLegGeoJsonSchema = z.object({
	distance: z.number(),
	duration: z.number(),
	steps: z.array(directionsStepGeoJsonSchema).optional(),
	summary: z.string().optional()
});

// GeoJSON LineString geometry schema
export const geoJsonLineStringSchema = z.object({
	type: z.literal('LineString'),
	coordinates: z.array(coordinateSchema)
});

// Generic directions route schema (supports both polyline and geojson)
export const directionsRouteSchema = z.object({
	distance: z.number(), // Total distance in meters
	duration: z.number(), // Total duration in seconds
	geometry: z.union([
		z.string(), // Encoded polyline string (when geometries=polyline)
		geoJsonLineStringSchema // GeoJSON LineString (when geometries=geojson)
	]),
	legs: z.array(directionsLegSchema),
	weight: z.number().optional(),
	weight_name: z.string().optional()
});

// Specific schema for GeoJSON format responses (when geometries=geojson)
export const directionsRouteGeoJsonSchema = z.object({
	distance: z.number(),
	duration: z.number(),
	geometry: geoJsonLineStringSchema, // Always GeoJSON when geometries=geojson
	legs: z.array(directionsLegGeoJsonSchema),
	weight: z.number().optional(),
	weight_name: z.string().optional()
});

export const directionsResponseSchema = z.object({
	code: z.string(), // "Ok" on success, or error code
	routes: z.array(directionsRouteSchema),
	waypoints: z.array(directionsWaypointSchema),
	message: z.string().optional() // Error message if code is not "Ok"
});

// Specific response schema for GeoJSON format
export const directionsResponseGeoJsonSchema = z.object({
	code: z.string(),
	routes: z.array(directionsRouteGeoJsonSchema),
	waypoints: z.array(directionsWaypointSchema),
	message: z.string().optional()
});

// Type exports
export type MapboxError = z.infer<typeof mapboxErrorSchema>;
export type Coordinate = z.infer<typeof coordinateSchema>;
export type GeoJsonLineString = z.infer<typeof geoJsonLineStringSchema>;
export type GeocodingFeature = z.infer<typeof geocodingFeatureSchema>;
export type GeocodingResponse = z.infer<typeof geocodingResponseSchema>;
export type MatrixWaypoint = z.infer<typeof matrixWaypointSchema>;
export type MatrixResponse = z.infer<typeof matrixResponseSchema>;
export type DirectionsWaypoint = z.infer<typeof directionsWaypointSchema>;
export type DirectionsStep = z.infer<typeof directionsStepSchema>;
export type DirectionsLeg = z.infer<typeof directionsLegSchema>;
export type DirectionsRoute = z.infer<typeof directionsRouteSchema>;
export type DirectionsRouteGeoJson = z.infer<typeof directionsRouteGeoJsonSchema>;
export type DirectionsResponse = z.infer<typeof directionsResponseSchema>;
export type DirectionsResponseGeoJson = z.infer<typeof directionsResponseGeoJsonSchema>;
