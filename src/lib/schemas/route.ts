import { z } from 'zod';
import { geoJsonLineStringSchema } from './common';

export const routeSchema = z.object({
	id: z.uuid(),
	organization_id: z.uuid(),
	map_id: z.uuid(),
	driver_id: z.uuid(),
	depot_id: z.uuid(),
	geometry: geoJsonLineStringSchema.nullable(), // GeoJSON LineString from Mapbox Directions API - nullable for failed recalculations
	duration: z.string().nullable(), // Stored as numeric string in DB
	created_at: z.date(),
	created_by: z.uuid().nullable(),
	updated_at: z.date(),
	updated_by: z.uuid().nullable()
});

export const createRouteSchema = z.object({
	organization_id: z.uuid(),
	map_id: z.uuid(),
	driver_id: z.uuid(),
	depot_id: z.uuid(),
	geometry: geoJsonLineStringSchema.nullable(), // GeoJSON LineString from Mapbox Directions API - nullable for failed recalculations
	duration: z.number().optional() // Number in seconds before DB conversion
});

export const updateRouteSchema = z.object({
	depot_id: z.uuid().optional(),
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
