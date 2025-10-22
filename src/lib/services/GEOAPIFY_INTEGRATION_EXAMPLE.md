# Integration Example: Using GeoApify Optimization Service

This guide shows how to integrate the optimization service with your map detail page.

## Response Structure

The `optimizeWithDrivers` method returns a structured result:

```typescript
interface OptimizationResult {
	routes: OptimizedDriverRoute[]; // One per driver
	unassigned: Array<{
		// Stops that couldn't be assigned
		stopId: string;
		reason?: string;
		location: [number, number];
	}>;
	summary: {
		totalDistance: number; // Total meters
		totalDuration: number; // Total seconds
		totalServiceTime: number; // Total service seconds
		totalStops: number; // Count of assigned stops
		totalDrivers: number; // Count of drivers with routes
	};
}

interface OptimizedDriverRoute {
	driverId: string; // Database driver ID
	routeStops: Omit<RouteStopCreate, 'route_id' | 'organization_id'>[]; // Ready to insert
	waypoints: Waypoint[]; // All points for map (start/stops/end)
	totalDistance: number; // Route distance in meters
	totalDuration: number; // Route duration in seconds
	totalServiceTime: number; // Total service time in seconds
}

// routeStops array contains:
{
	stop_id: string; // Database stop ID
	sequence: number; // Order (1-based)
}

interface Waypoint {
	location: [number, number]; // [lon, lat]
	type: 'start' | 'stop' | 'end';
	stopId?: string; // Present if type === 'stop'
	arrival?: number; // Seconds from start
	service?: number; // Service time in seconds
}
```

## Basic Integration

### 1. Server-Side Route Handler

Create an API endpoint to handle optimization requests:

```typescript
// src/routes/api/maps/[mapId]/optimize/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { drivers, stops, locations, routes, routeStops } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { optimizationService } from '$lib/services/geoapify-optimization';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const session = await locals.auth();
	if (!session?.user?.organizationId) {
		throw error(401, 'Unauthorized');
	}

	const { mapId } = params;
	const body = await request.json();
	const { depotLocation, endBehavior, serviceTime } = body;

	try {
		// Fetch drivers assigned to this map
		const mapRoutes = await db
			.select({
				driver: drivers
			})
			.from(routes)
			.innerJoin(drivers, eq(routes.driver_id, drivers.id))
			.where(
				and(eq(routes.map_id, mapId), eq(routes.organization_id, session.user.organizationId))
			);

		const assignedDrivers = mapRoutes.map((r) => r.driver);

		// Fetch stops with locations
		const mapStops = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(and(eq(stops.map_id, mapId), eq(stops.organization_id, session.user.organizationId)));

		// Run optimization - returns structured result
		const result = await optimizationService.optimizeWithDrivers(
			assignedDrivers,
			mapStops, // Already in { stop, location } format
			{
				mode: 'drive',
				optimize: 'time',
				depot: depotLocation
					? {
							location: depotLocation,
							endBehavior: endBehavior || 'depot'
						}
					: undefined,
				globalStopConfig: {
					serviceTime: serviceTime || 300 // Default 5 minutes
				}
			}
		);

		// Update routes in database with optimized results
		for (const optimizedRoute of result.routes) {
			// Update route totals
			await db
				.update(routes)
				.set({
					total_distance_m: optimizedRoute.totalDistance,
					total_duration_s: optimizedRoute.totalDuration,
					updated_at: new Date()
				})
				.where(and(eq(routes.driver_id, optimizedRoute.driverId), eq(routes.map_id, mapId)));

			// Get the route ID
			const [dbRoute] = await db
				.select()
				.from(routes)
				.where(and(eq(routes.driver_id, optimizedRoute.driverId), eq(routes.map_id, mapId)));

			if (!dbRoute) continue;

			// Delete existing route stops
			await db.delete(routeStops).where(eq(routeStops.route_id, dbRoute.id));

			// Insert optimized route stops (just add route_id and organization_id)
			for (const routeStop of optimizedRoute.routeStops) {
				await db.insert(routeStops).values({
					...routeStop, // Contains stop_id and sequence
					route_id: dbRoute.id,
					organization_id: session.user.organizationId,
					created_at: new Date(),
					updated_at: new Date()
				});
			}
		}

		return json({
			success: true,
			routes: result.routes,
			unassigned: result.unassigned,
			summary: result.summary
		});
	} catch (err) {
		console.error('Optimization error:', err);
		throw error(500, err instanceof Error ? err.message : 'Optimization failed');
	}
};
```

### 2. Frontend Integration

Add an optimization UI to your map detail page:

```svelte
<!-- src/routes/maps/[mapId]/+page.svelte -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { OptimizationResult } from '$lib/services/geoapify-optimization';

	let { data } = $props();

	// Optimization settings
	let depotLat = $state('');
	let depotLon = $state('');
	let endBehavior = $state<'depot' | 'driver-address' | 'last-stop'>('depot');
	let serviceTime = $state(300); // 5 minutes default
	let optimizing = $state(false);
	let optimizationResult = $state<string | null>(null);

	async function optimizeRoutes() {
		if (!depotLat || !depotLon) {
			alert('Please enter depot coordinates');
			return;
		}

		optimizing = true;
		optimizationResult = null;

		try {
			const response = await fetch(`/api/maps/${data.map.id}/optimize`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					depotLocation: [parseFloat(depotLon), parseFloat(depotLat)],
					endBehavior,
					serviceTime
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Optimization failed');
			}

			const result = await response.json();
			optimizationResult =
				`✓ Optimized ${result.routes.length} routes\n` +
				`Total distance: ${(result.summary.total_distance / 1000).toFixed(2)} km\n` +
				`Total time: ${Math.round(result.summary.total_duration / 60)} minutes`;

			// Refresh page data
			await invalidateAll();
		} catch (err) {
			optimizationResult = `✗ Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			optimizing = false;
		}
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>Route Optimization</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		<div class="grid grid-cols-2 gap-4">
			<div>
				<Label for="depot-lat">Depot Latitude</Label>
				<Input
					id="depot-lat"
					type="number"
					step="0.000001"
					bind:value={depotLat}
					placeholder="37.7749"
				/>
			</div>
			<div>
				<Label for="depot-lon">Depot Longitude</Label>
				<Input
					id="depot-lon"
					type="number"
					step="0.000001"
					bind:value={depotLon}
					placeholder="-122.4194"
				/>
			</div>
		</div>

		<div>
			<Label for="end-behavior">Route End Behavior</Label>
			<Select bind:value={endBehavior}>
				<SelectTrigger>
					<SelectValue placeholder="Select end behavior" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="depot">Return to Depot</SelectItem>
					<SelectItem value="driver-address">Return to Driver Address</SelectItem>
					<SelectItem value="last-stop">End at Last Stop</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<div>
			<Label for="service-time">Service Time per Stop (seconds)</Label>
			<Input id="service-time" type="number" bind:value={serviceTime} min="0" step="60" />
			<p class="mt-1 text-sm text-muted-foreground">
				{Math.round(serviceTime / 60)} minutes
			</p>
		</div>

		<Button onclick={optimizeRoutes} disabled={optimizing || !depotLat || !depotLon} class="w-full">
			{optimizing ? 'Optimizing...' : 'Optimize Routes'}
		</Button>

		{#if optimizationResult}
			<pre class="rounded bg-muted p-4 text-sm whitespace-pre-wrap">
{optimizationResult}
			</pre>
		{/if}
	</CardContent>
</Card>
```

## Advanced Usage

### Per-Driver Configuration

Configure individual drivers with specific attributes:

```typescript
const result = await optimizationService.optimizeWithDrivers(drivers, stops, {
	mode: 'drive',
	depot: {
		location: [-122.4194, 37.7749],
		endBehavior: 'depot'
	},
	// Per-driver config
	driverConfig: {
		'driver-uuid-1': {
			homeLocation: [-122.4084, 37.7849],
			timeWindow: [
				optimizationService.timeToSeconds('08:00'),
				optimizationService.timeToSeconds('16:00')
			],
			capacity: [100, 50], // [weight, volume]
			skills: ['refrigerated', 'heavy-lifting']
		},
		'driver-uuid-2': {
			timeWindow: [
				optimizationService.timeToSeconds('10:00'),
				optimizationService.timeToSeconds('18:00')
			],
			capacity: [150, 75],
			skills: ['standard']
		}
	},
	// Or use global config for all drivers
	globalDriverConfig: {
		capacity: [100],
		speedFactor: 1.0
	}
});
```

### Per-Stop Configuration

Configure individual stops with specific requirements:

```typescript
const result = await optimizationService.optimizeWithDrivers(drivers, stops, {
	mode: 'drive',
	depot: { location: [-122.4194, 37.7749], endBehavior: 'depot' },
	stopConfig: {
		'stop-uuid-1': {
			serviceTime: 600, // 10 minutes
			delivery: [20, 5], // [weight, volume]
			skills: ['refrigerated'], // Requires refrigerated truck
			priority: 100, // High priority
			timeWindows: [
				[optimizationService.timeToSeconds('09:00'), optimizationService.timeToSeconds('11:00')]
			]
		},
		'stop-uuid-2': {
			serviceTime: 300,
			delivery: [10, 2],
			priority: 50
		}
	},
	// Or use global config for all stops
	globalStopConfig: {
		serviceTime: 300, // 5 minutes default
		priority: 50
	}
});
```

### Without Depot (Driver Home Addresses)

If drivers start from their own addresses:

```typescript
const result = await optimizationService.optimizeWithDrivers(drivers, stops, {
	mode: 'drive',
	// No depot config
	driverConfig: {
		'driver-uuid-1': {
			homeLocation: [-122.4084, 37.7849], // Driver's home
			timeWindow: [
				optimizationService.timeToSeconds('08:00'),
				optimizationService.timeToSeconds('17:00')
			]
		},
		'driver-uuid-2': {
			homeLocation: [-122.3984, 37.7949], // Different home
			timeWindow: [
				optimizationService.timeToSeconds('09:00'),
				optimizationService.timeToSeconds('18:00')
			]
		}
	}
});
```

## Handling Results

### Display Unassigned Stops

```typescript
if (result.unassigned && result.unassigned.length > 0) {
	console.warn('Some stops could not be assigned:');
	for (const unassigned of result.unassigned) {
		console.warn(`- Stop ${unassigned.stopId}: ${unassigned.reason || 'Unknown reason'}`);
	}
}
```

### Display Route Information

```typescript
// Show each driver's route
for (const route of result.routes) {
	console.log(`Driver ${route.driverId}:`);
	console.log(`  ${route.routeStops.length} stops`);
	console.log(`  ${(route.totalDistance / 1000).toFixed(2)} km`);
	console.log(`  ${Math.round(route.totalDuration / 60)} minutes`);

	// List stops in order
	for (const routeStop of route.routeStops) {
		console.log(`  ${routeStop.sequence}. Stop ${routeStop.stop_id}`);
	}
}
```

### Visualize Routes on Map

Use the `waypoints` array to draw routes on your MapView component:

```typescript
// In your MapView component or map initialization
function drawOptimizedRoutes(optimizationResult: OptimizationResult, map: mapboxgl.Map) {
	// Color palette for different drivers
	const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

	optimizationResult.routes.forEach((route, index) => {
		const color = colors[index % colors.length];

		// Extract coordinates from waypoints
		const coordinates = route.waypoints.map((wp) => wp.location);

		// Add route line
		map.addSource(`route-${route.driverId}`, {
			type: 'geojson',
			data: {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'LineString',
					coordinates
				}
			}
		});

		map.addLayer({
			id: `route-line-${route.driverId}`,
			type: 'line',
			source: `route-${route.driverId}`,
			layout: {
				'line-join': 'round',
				'line-cap': 'round'
			},
			paint: {
				'line-color': color,
				'line-width': 3,
				'line-opacity': 0.8
			}
		});

		// Add numbered markers for stops
		route.routeStops.forEach((routeStop, index) => {
			// Get waypoint for this stop to get coordinates
			const waypoint = route.waypoints.find((wp) => wp.stopId === routeStop.stop_id);
			if (!waypoint) return;

			const el = document.createElement('div');
			el.className = 'route-marker';
			el.textContent = routeStop.sequence.toString();
			el.style.backgroundColor = color;
			el.style.color = 'white';
			el.style.borderRadius = '50%';
			el.style.width = '30px';
			el.style.height = '30px';
			el.style.display = 'flex';
			el.style.alignItems = 'center';
			el.style.justifyContent = 'center';
			el.style.fontWeight = 'bold';
			el.style.border = '2px solid white';

			new mapboxgl.Marker(el)
				.setLngLat(waypoint.location)
				.setPopup(
					new mapboxgl.Popup().setHTML(
						`<strong>Stop ${routeStop.sequence}</strong><br/>` +
							`Stop ID: ${routeStop.stop_id}<br/>` +
							(waypoint.arrival ? `ETA: ${Math.round(waypoint.arrival / 60)} min<br/>` : '') +
							(waypoint.service ? `Service: ${Math.round(waypoint.service / 60)} min` : '')
					)
				)
				.addTo(map);
		});

		// Add start marker
		const startWaypoint = route.waypoints.find((wp) => wp.type === 'start');
		if (startWaypoint) {
			const startEl = document.createElement('div');
			startEl.innerHTML = '🚚';
			startEl.style.fontSize = '24px';

			new mapboxgl.Marker(startEl)
				.setLngLat(startWaypoint.location)
				.setPopup(new mapboxgl.Popup().setHTML('<strong>Start</strong>'))
				.addTo(map);
		}

		// Add end marker
		const endWaypoint = route.waypoints.find((wp) => wp.type === 'end');
		if (endWaypoint) {
			const endEl = document.createElement('div');
			endEl.innerHTML = '🏁';
			endEl.style.fontSize = '24px';

			new mapboxgl.Marker(endEl)
				.setLngLat(endWaypoint.location)
				.setPopup(new mapboxgl.Popup().setHTML('<strong>End</strong>'))
				.addTo(map);
		}
	});

	// Fit map to show all routes
	if (optimizationResult.routes.length > 0) {
		const allCoordinates = optimizationResult.routes.flatMap((r) =>
			r.waypoints.map((wp) => wp.location)
		);

		const bounds = allCoordinates.reduce(
			(bounds, coord) => bounds.extend(coord),
			new mapboxgl.LngLatBounds(allCoordinates[0], allCoordinates[0])
		);

		map.fitBounds(bounds, { padding: 50 });
	}
}
```

### Save to Database

The structured format makes it easy to save to your database:

```typescript
// After optimization
for (const optimizedRoute of result.routes) {
	// Update route record
	await db
		.update(routes)
		.set({
			total_distance_m: optimizedRoute.totalDistance,
			total_duration_s: optimizedRoute.totalDuration,
			updated_at: new Date()
		})
		.where(eq(routes.driver_id, optimizedRoute.driverId));

	// Get route ID
	const [dbRoute] = await db
		.select()
		.from(routes)
		.where(eq(routes.driver_id, optimizedRoute.driverId));

	// Clear old stops
	await db.delete(routeStops).where(eq(routeStops.route_id, dbRoute.id));

	// Insert optimized stops - just spread the routeStop and add route_id + organization_id
	for (const routeStop of optimizedRoute.routeStops) {
		await db.insert(routeStops).values({
			...routeStop, // Contains stop_id and sequence
			route_id: dbRoute.id,
			organization_id: session.user.organizationId,
			created_at: new Date(),
			updated_at: new Date()
		});
	}

	// Optionally store waypoints as JSON for map replay
	await db
		.update(routes)
		.set({
			waypoints: JSON.stringify(optimizedRoute.waypoints)
		})
		.where(eq(routes.id, dbRoute.id));
}
```

    		data: {
    			type: 'Feature',
    			geometry: {
    				type: 'LineString',
    				coordinates
    			}
    		}
    	},
    	paint: {
    		'line-color': getDriverColor(route.agent_id),
    		'line-width': 3
    	}
    });

}

````

## Error Handling

Common errors and solutions:

```typescript
try {
	const result = await optimizationService.optimizeWithDrivers(drivers, stops, options);
} catch (error) {
	if (error instanceof Error) {
		if (error.message.includes('no start location')) {
			// Driver missing configuration
			console.error('Configure depot or driver home locations');
		} else if (error.message.includes('no coordinates')) {
			// Stop not geocoded
			console.error('Geocode all locations before optimizing');
		} else if (error.message.includes('API key')) {
			// Missing GeoApify API key
			console.error('Set GEOAPIFY_API_KEY in .env');
		}
	}
}
````
