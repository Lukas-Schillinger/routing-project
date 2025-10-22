# GeoApify Route Optimization Service

This service provides route optimization capabilities using the GeoApify Route Planner API. It can solve Vehicle Routing Problems (VRP) with multiple drivers/vehicles and stops.

## Features

- ✅ Multi-vehicle route optimization
- ✅ Time windows for drivers and stops
- ✅ Capacity constraints (weight, volume, packages, etc.)
- ✅ Service time at each stop
- ✅ Skills matching (driver skills required for specific stops)
- ✅ Priority-based stop assignment
- ✅ Pickup and delivery constraints
- ✅ Multiple optimization modes (drive, walk, bicycle, truck)
- ✅ Traffic consideration
- ✅ Helper utilities for time conversion and formatting

## Setup

1. Get a GeoApify API key from [https://myprojects.geoapify.com/](https://myprojects.geoapify.com/)
2. Add to your `.env` file:
   ```
   GEOAPIFY_API_KEY=your_api_key_here
   ```

## Basic Usage

```typescript
import { optimizationService } from '$lib/services/geoapify-optimization';

// Define your drivers/vehicles
const agents = [
	{
		id: 'driver-1',
		start_location: [-122.4194, 37.7749], // [longitude, latitude]
		end_location: [-122.4194, 37.7749], // return to start
		time_window: [28800, 64800], // 8am to 6pm (in seconds)
		capacity: [100] // can carry 100 units
	},
	{
		id: 'driver-2',
		start_location: [-122.4084, 37.7849],
		end_location: [-122.4084, 37.7849],
		time_window: [28800, 64800],
		capacity: [100]
	}
];

// Define your stops/deliveries
const jobs = [
	{
		id: 'stop-1',
		location: [-122.4084, 37.7849],
		service: 300, // 5 minutes service time
		delivery: [10], // deliver 10 units
		priority: 100 // high priority (0-100)
	},
	{
		id: 'stop-2',
		location: [-122.4194, 37.7849],
		service: 600, // 10 minutes service time
		delivery: [20], // deliver 20 units
		priority: 50 // medium priority
	}
];

// Optimize routes
const result = await optimizationService.optimizeRoutes(agents, jobs, {
	mode: 'drive',
	optimize: 'time',
	traffic: 'approximated'
});

// Access optimized routes
for (const route of result.routes) {
	console.log(`Route for ${route.agent_id}:`);
	console.log(`  Total distance: ${route.distance}m`);
	console.log(`  Total duration: ${route.duration}s`);

	for (const step of route.steps) {
		console.log(`  - ${step.type}: ${step.id || 'depot'}`);
		console.log(`    Location: ${step.location}`);
		console.log(`    Arrival: ${step.arrival}s`);
	}
}
```

## Using Helper Methods

The service provides helper methods to make it easier to work with routes:

```typescript
// Create agents using helper method
const agent = optimizationService.createAgent(
	'driver-1',
	[-122.4194, 37.7749], // start
	[-122.4194, 37.7749], // end
	{
		timeWindow: [
			optimizationService.timeToSeconds('08:00'),
			optimizationService.timeToSeconds('18:00')
		],
		capacity: [100],
		skills: ['refrigerated', 'heavy-lifting']
	}
);

// Create jobs using helper method
const job = optimizationService.createJob('stop-1', [-122.4084, 37.7849], {
	service: 300, // 5 minutes
	delivery: [10],
	skills: ['refrigerated'], // requires driver with this skill
	priority: 100
});

// Convert times
const morningStart = optimizationService.timeToSeconds('09:00'); // 32400
const timeString = optimizationService.secondsToTime(32400); // "09:00:00"

// Format distances
const miles = optimizationService.metersToMiles(5000); // 3.11 miles
const km = optimizationService.metersToKilometers(5000); // 5 km

// Format durations
const duration = optimizationService.formatDuration(7265); // "2h 1m 5s"
```

## Advanced Features

### Time Windows

Time windows restrict when a driver can work or when a stop can be visited:

```typescript
const agent = {
	id: 'driver-1',
	start_location: [-122.4194, 37.7749],
	time_window: [
		optimizationService.timeToSeconds('08:00'), // Can't start before 8am
		optimizationService.timeToSeconds('17:00') // Must finish by 5pm
	]
};

const job = {
	id: 'stop-1',
	location: [-122.4084, 37.7849],
	time_windows: [
		[
			optimizationService.timeToSeconds('09:00'), // Window 1: 9am-11am
			optimizationService.timeToSeconds('11:00')
		],
		[
			optimizationService.timeToSeconds('14:00'), // Window 2: 2pm-4pm
			optimizationService.timeToSeconds('16:00')
		]
	]
};
```

### Skills Matching

Use skills to ensure only qualified drivers are assigned to specific stops:

```typescript
const agents = [
	{
		id: 'driver-1',
		start_location: [-122.4194, 37.7749],
		skills: ['refrigerated', 'hazmat'] // This driver can handle special deliveries
	},
	{
		id: 'driver-2',
		start_location: [-122.4084, 37.7849],
		skills: ['standard'] // Regular driver
	}
];

const jobs = [
	{
		id: 'pharmacy-delivery',
		location: [-122.4194, 37.7949],
		skills: ['refrigerated'], // Requires refrigerated truck
		delivery: [5]
	},
	{
		id: 'regular-delivery',
		location: [-122.4284, 37.7849],
		// No skills required - any driver can handle this
		delivery: [10]
	}
];
```

### Capacity Constraints

Handle multiple capacity dimensions (weight, volume, number of packages, etc.):

```typescript
const agent = {
	id: 'driver-1',
	start_location: [-122.4194, 37.7749],
	capacity: [1000, 50, 100] // [weight_kg, volume_m3, num_packages]
};

const job = {
	id: 'stop-1',
	location: [-122.4084, 37.7849],
	delivery: [100, 5, 10] // Delivery: 100kg, 5m³, 10 packages
};
```

### Pickup and Delivery

Handle both pickups and deliveries in the same route:

```typescript
const job = {
	id: 'stop-1',
	location: [-122.4084, 37.7849],
	delivery: [20], // Deliver 20 units
	pickup: [10], // Pick up 10 units
	service: 600 // 10 minutes for both operations
};
```

## Integration with Database

Example of how to integrate with your database schema:

```typescript
import { db } from '$lib/server/db';
import { routes, stops, locations, drivers } from '$lib/server/db/schema';
import { optimizationService } from '$lib/services/geoapify-optimization';
import { eq } from 'drizzle-orm';

export async function optimizeMapRoutes(mapId: string) {
	// Fetch drivers assigned to this map
	const mapRoutes = await db
		.select()
		.from(routes)
		.innerJoin(drivers, eq(routes.driver_id, drivers.id))
		.where(eq(routes.map_id, mapId));

	// Fetch stops for this map
	const mapStops = await db
		.select()
		.from(stops)
		.innerJoin(locations, eq(stops.location_id, locations.id))
		.where(eq(stops.map_id, mapId));

	// Build agents from drivers
	const agents = mapRoutes.map(({ drivers: driver, routes: route }) => ({
		id: driver.id,
		start_location: [driver.start_lng || -122.4194, driver.start_lat || 37.7749] as [
			number,
			number
		],
		end_location: [driver.end_lng || -122.4194, driver.end_lat || 37.7749] as [number, number],
		capacity: [100] // You can store this in your driver schema
	}));

	// Build jobs from stops
	const jobs = mapStops.map(({ stops: stop, locations: location }) => ({
		id: stop.id,
		location: [location.longitude, location.latitude] as [number, number],
		service: 300, // 5 minutes default, could be stored in stops table
		delivery: [1] // Could be based on stop priority or weight field
	}));

	// Optimize
	const result = await optimizationService.optimizeRoutes(agents, jobs, {
		mode: 'drive',
		optimize: 'time'
	});

	// Update routes in database
	for (const route of result.routes) {
		await db
			.update(routes)
			.set({
				total_distance_m: route.distance,
				total_duration_s: route.duration
			})
			.where(eq(routes.driver_id, route.agent_id));

		// Update stop sequence
		const jobSteps = route.steps.filter((step) => step.type === 'job');
		for (let i = 0; i < jobSteps.length; i++) {
			const step = jobSteps[i];
			if (step.id) {
				await db
					.update(stops)
					.set({
						sequence: i + 1,
						estimated_arrival_s: step.arrival
					})
					.where(eq(stops.id, step.id));
			}
		}
	}

	return result;
}
```

## Optimization Modes

- `drive` - Car/van routing (default)
- `walk` - Pedestrian routing
- `bicycle` - Bicycle routing
- `truck` - Truck routing with restrictions

## Optimization Goals

- `time` - Minimize total travel time (default)
- `distance` - Minimize total distance

## Traffic Options

- `free_flow` - Ignore traffic (faster computation)
- `approximated` - Consider typical traffic patterns

## Response Structure

```typescript
{
  routes: [
    {
      agent_id: 'driver-1',
      steps: [
        { type: 'start', location: [-122.4194, 37.7749], arrival: 0 },
        { type: 'job', id: 'stop-1', location: [...], arrival: 600, service: 300 },
        { type: 'job', id: 'stop-2', location: [...], arrival: 1200, service: 600 },
        { type: 'end', location: [-122.4194, 37.7749], arrival: 2400 }
      ],
      distance: 5000,  // meters
      duration: 2400,  // seconds
      service: 900     // total service time in seconds
    }
  ],
  unassigned: [
    { id: 'stop-3', location: [...], reason: 'capacity exceeded' }
  ],
  summary: {
    total_distance: 5000,
    total_duration: 2400
  }
}
```

## Error Handling

```typescript
try {
	const result = await optimizationService.optimizeRoutes(agents, jobs);
} catch (error) {
	if (error instanceof GeoApifyApiError) {
		console.error('API Error:', error.message);
		console.error('Status:', error.status);
		console.error('Code:', error.code);
	} else if (error instanceof ZodError) {
		console.error('Validation Error:', error.errors);
	} else {
		console.error('Unknown error:', error);
	}
}
```

## API Documentation

Full API documentation: [https://apidocs.geoapify.com/docs/route-planner/](https://apidocs.geoapify.com/docs/route-planner/)
