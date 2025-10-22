# GeoApify Optimization - What Changed

## Summary of Updates

The `optimizeWithDrivers` method now returns a **structured, app-friendly format** instead of raw GeoApify API responses.

## New Return Type: `OptimizationResult`

### Before

```typescript
Promise<GeoApifyOptimizationResponse>; // Raw API format
```

### After

```typescript
Promise<OptimizationResult>; // Structured app format
```

## Structure Breakdown

```typescript
{
  routes: [
    {
      driverId: "driver-uuid-123",           // Your database driver ID
      routeStops: [                          // Ready to insert into route_stops table
        {
          stop_id: "stop-uuid-456",          // Database stop ID
          sequence: 1                        // 1-based ordering
        },
        {
          stop_id: "stop-uuid-789",
          sequence: 2
        }
        // ... more stops
      ],
      waypoints: [                           // For map visualization
        {
          location: [-122.42, 37.78],        // [lon, lat]
          type: "start",                     // 'start' | 'stop' | 'end'
          arrival: 0
        },
        {
          location: [-122.41, 37.77],
          type: "stop",
          stopId: "stop-uuid-456",
          arrival: 600,
          service: 300
        },
        {
          location: [-122.42, 37.78],
          type: "end",
          arrival: 2400
        }
      ],
      totalDistance: 15000,                  // Meters
      totalDuration: 2400,                   // Seconds
      totalServiceTime: 900                  // Seconds
    }
  ],
  unassigned: [                              // Stops that couldn't be assigned
    {
      stopId: "stop-uuid-789",
      reason: "Time window cannot be met",
      location: [-122.43, 37.79]
    }
  ],
  summary: {
    totalDistance: 15000,
    totalDuration: 2400,
    totalServiceTime: 900,
    totalStops: 3,
    totalDrivers: 1
  }
}
```

## Key Benefits

### 1. **Database-Ready**

- `routeStops` array matches your `RouteStopCreate` type (minus route_id and organization_id)
- Contains only `stop_id` and `sequence` - just what you need
- Spread operator ready: `{ ...routeStop, route_id, organization_id }`

### 2. **Map-Ready**

- `waypoints` array contains all coordinates in order with timing info
- Includes start, all stops, and end points
- Use arrival times from waypoints for ETAs
- Can be used directly with Mapbox/Leaflet LineString

### 3. **Type-Safe**

- Full TypeScript support
- Import types: `OptimizationResult`, `OptimizedDriverRoute`, `OptimizedRouteStop`, `Waypoint`

### 4. **Summary Statistics**

- Aggregate metrics across all routes
- Easy to display in UI

## Usage Examples

### Simple Integration

```typescript
const result = await optimizationService.optimizeWithDrivers(drivers, stops, options);

// Save to database
for (const route of result.routes) {
	// Update route totals
	await updateRoute(route.driverId, {
		totalDistance: route.totalDistance,
		totalDuration: route.totalDuration
	});

	// Insert route stops - super simple with spread operator!
	for (const routeStop of route.routeStops) {
		await insertRouteStop({
			...routeStop, // Contains stop_id and sequence
			route_id: getRouteId(route.driverId),
			organization_id: orgId
		});
	}
}
```

### Draw on Map

```typescript
// Draw each driver's route
for (const route of result.routes) {
	const coordinates = route.waypoints.map((wp) => wp.location);

	map.addLayer({
		type: 'line',
		source: {
			type: 'geojson',
			data: {
				type: 'LineString',
				coordinates
			}
		}
	});
}
```

### Display Summary

```typescript
console.log(`Optimized ${result.summary.totalDrivers} drivers`);
console.log(`Assigned ${result.summary.totalStops} stops`);
console.log(`Total distance: ${(result.summary.totalDistance / 1000).toFixed(2)} km`);
console.log(`Total time: ${Math.round(result.summary.totalDuration / 60)} minutes`);

if (result.unassigned.length > 0) {
	console.warn(`${result.unassigned.length} stops couldn't be assigned`);
}
```

## Migration Notes

If you have existing code using the old API response format, update your code:

### Old Way

```typescript
const result = await optimizationService.optimizeWithDrivers(drivers, stops, options);

// Had to filter and transform steps
const jobSteps = result.routes[0].steps.filter((step) => step.type === 'job');
for (let i = 0; i < jobSteps.length; i++) {
	const sequence = i + 1;
	const stopId = jobSteps[i].id;
	// ...
}
```

### New Way

```typescript
const result = await optimizationService.optimizeWithDrivers(drivers, stops, options);

// Ready to use with spread operator!
for (const routeStop of result.routes[0].routeStops) {
	await db.insert(routeStops).values({
		...routeStop, // stop_id and sequence
		route_id: dbRoute.id,
		organization_id: orgId
	});
}
```

## Available Types

Import these types from the service:

```typescript
import type {
	OptimizationResult,
	OptimizedDriverRoute,
	OptimizedRouteStop,
	Waypoint
} from '$lib/services/geoapify-optimization';
```

## Internal Note

The `optimizeRoutes` method (lower-level) still returns the raw `GeoApifyOptimizationResponse` if you need it. Use `optimizeWithDrivers` for normal app integration.
