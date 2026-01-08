import { z } from 'zod';

// GeoJSON LineString schema - matches Mapbox Directions API format when geometries=geojson
const geoJsonLineStringSchema = z.object({
	type: z.literal('LineString'),
	coordinates: z.array(z.array(z.number())) // Array of [longitude, latitude] positions
});

export const routeSchema = z.object({
	id: z.string().uuid(),
	organization_id: z.string().uuid(),
	map_id: z.string().uuid(),
	driver_id: z.string().uuid(),
	depot_id: z.string().uuid(),
	geometry: geoJsonLineStringSchema, // GeoJSON LineString from Mapbox Directions API
	duration: z.string().nullable(), // Stored as numeric string in DB
	created_at: z.date(),
	updated_at: z.date()
});

export const createRouteSchema = z.object({
	organization_id: z.string().uuid(),
	map_id: z.string().uuid(),
	driver_id: z.string().uuid(),
	depot_id: z.string().uuid(),
	geometry: geoJsonLineStringSchema, // GeoJSON LineString from Mapbox Directions API
	duration: z.number().optional() // Number in seconds before DB conversion
});

export const updateRouteSchema = z.object({
	depot_id: z.string().uuid().optional(),
	geometry: geoJsonLineStringSchema.optional(),
	duration: z.number().optional()
});

export type Route = z.infer<typeof routeSchema>;
export type CreateRoute = z.infer<typeof createRouteSchema>;
export type UpdateRoute = z.infer<typeof updateRouteSchema>;

// Composite type for route detail pages
export type { DepotWithLocationJoin } from './depot';
export type { Driver } from './driver';
export type { Map } from './map';
export type { StopWithLocation } from './stop';

import type { DepotWithLocationJoin } from './depot';
import type { Driver } from './driver';
import type { Map } from './map';
import type { StopWithLocation } from './stop';

export type RouteWithDetails = {
	route: Route;
	map: Map;
	stops: StopWithLocation[];
	driver: Driver;
	depot: DepotWithLocationJoin;
};
