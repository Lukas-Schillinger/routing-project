# GeoApify Optimization - Quick Reference

## Main Method

```typescript
await optimizationService.optimizeWithDrivers(drivers, stops, options);
```

## Options Structure

### Depot Configuration

Control where drivers start and end their routes:

```typescript
{
  depot: {
    location: [longitude, latitude],      // Center point (e.g., warehouse)
    endBehavior: 'depot'                   // How routes should end
  }
}
```

**End Behavior Options:**

- `'depot'` - All drivers return to depot (round trip)
- `'driver-address'` - Drivers return to their home address (requires `driverConfig[id].homeLocation`)
- `'last-stop'` - Drivers end at their last delivery (one-way trip)

### Driver Configuration

#### Global (applied to all drivers):

```typescript
{
  globalDriverConfig: {
    capacity: [100],                       // Vehicle capacity
    timeWindow: [28800, 64800],            // 8am-6pm in seconds
    skills: ['standard'],                  // Driver skills
    speedFactor: 1.0                       // Speed multiplier (0.5-2.0)
  }
}
```

#### Per-Driver (override specific drivers):

```typescript
{
  driverConfig: {
    'driver-uuid-123': {
      homeLocation: [-122.4194, 37.7749], // Driver's home/base
      capacity: [150, 50],                 // [weight_kg, volume_m3]
      timeWindow: [32400, 68400],          // 9am-7pm
      skills: ['refrigerated', 'hazmat'],  // Special qualifications
      speedFactor: 0.8                     // Drives 20% slower
    }
  }
}
```

### Stop Configuration

#### Global (applied to all stops):

```typescript
{
  globalStopConfig: {
    serviceTime: 300,                      // 5 minutes per stop
    priority: 50,                          // Medium priority (0-100)
    delivery: [1]                          // Default delivery amount
  }
}
```

#### Per-Stop (override specific stops):

```typescript
{
  stopConfig: {
    'stop-uuid-456': {
      serviceTime: 600,                    // 10 minutes
      delivery: [20, 5],                   // [weight, volume]
      pickup: [5, 1],                      // Also picking up
      skills: ['refrigerated'],            // Requires special driver
      priority: 100,                       // High priority
      timeWindows: [                       // Delivery windows
        [32400, 39600],                    // 9am-11am
        [50400, 57600]                     // 2pm-4pm
      ]
    }
  }
}
```

### Optimization Settings

```typescript
{
  mode: 'drive',              // 'drive' | 'walk' | 'bicycle' | 'truck'
  optimize: 'time',           // 'time' | 'distance'
  traffic: 'approximated'     // 'free_flow' | 'approximated'
}
```

## Complete Example

```typescript
const result = await optimizationService.optimizeWithDrivers(drivers, stops, {
	// Basic settings
	mode: 'drive',
	optimize: 'time',
	traffic: 'approximated',

	// Central depot
	depot: {
		location: [-122.4194, 37.7749],
		endBehavior: 'depot'
	},

	// All drivers work 8am-5pm with 100 unit capacity
	globalDriverConfig: {
		timeWindow: [28800, 61200],
		capacity: [100]
	},

	// Override one driver
	driverConfig: {
		'special-driver-id': {
			timeWindow: [32400, 64800], // 9am-6pm
			capacity: [150], // Bigger truck
			skills: ['refrigerated'] // Has refrigeration
		}
	},

	// All stops take 5 minutes
	globalStopConfig: {
		serviceTime: 300,
		delivery: [1]
	},

	// Override one stop
	stopConfig: {
		'special-stop-id': {
			serviceTime: 900, // 15 minutes
			delivery: [10], // Larger delivery
			skills: ['refrigerated'], // Needs refrigeration
			priority: 100, // Must be delivered
			timeWindows: [[32400, 43200]] // 9am-12pm only
		}
	}
});
```

## Time Helper Functions

```typescript
// Convert time to seconds
const seconds = optimizationService.timeToSeconds('09:30'); // 34200

// Convert seconds to time
const time = optimizationService.secondsToTime(34200); // "09:30:00"

// Format duration
const duration = optimizationService.formatDuration(7265); // "2h 1m 5s"
```

## Distance Helper Functions

```typescript
// Meters to miles
const miles = optimizationService.metersToMiles(5000); // 3.11

// Meters to kilometers
const km = optimizationService.metersToKilometers(5000); // 5
```

## Common Patterns

### Single Depot, Return to Depot

```typescript
{
  depot: {
    location: [-122.4194, 37.7749],
    endBehavior: 'depot'
  }
}
```

### Single Depot, End at Last Stop

```typescript
{
  depot: {
    location: [-122.4194, 37.7749],
    endBehavior: 'last-stop'
  }
}
```

### No Depot (Drivers Start from Home)

```typescript
{
  driverConfig: {
    'driver-1': { homeLocation: [-122.40, 37.77] },
    'driver-2': { homeLocation: [-122.41, 37.78] }
  }
}
```

### Time Windows

```typescript
{
  globalDriverConfig: {
    timeWindow: [
      optimizationService.timeToSeconds('08:00'),
      optimizationService.timeToSeconds('17:00')
    ]
  },
  stopConfig: {
    'morning-stop': {
      timeWindows: [[
        optimizationService.timeToSeconds('09:00'),
        optimizationService.timeToSeconds('12:00')
      ]]
    }
  }
}
```

### Capacity Constraints

```typescript
{
  globalDriverConfig: {
    capacity: [1000, 50, 100]  // [weight_kg, volume_m3, num_packages]
  },
  stopConfig: {
    'stop-1': {
      delivery: [100, 5, 10]   // Uses same units
    }
  }
}
```

### Skills Matching

```typescript
{
  driverConfig: {
    'driver-1': { skills: ['refrigerated', 'hazmat'] },
    'driver-2': { skills: ['standard'] }
  },
  stopConfig: {
    'pharmacy-stop': {
      skills: ['refrigerated']  // Only driver-1 can deliver
    },
    'regular-stop': {
      // No skills needed - any driver can deliver
    }
  }
}
```
