# Map Route Optimization API

## POST `/api/maps/[mapId]/optimize`

Optimizes routes for all drivers and stops assigned to a map using the GeoApify Route Planner API. Updates stops with driver assignments and delivery sequence.

### Prerequisites

- Stops must be added to the map
- Drivers must be assigned to the map

### Request Body

```typescript
{
  // Transportation mode (optional, default: 'drive')
  mode?: 'drive' | 'walk' | 'bicycle' | 'truck';

  // Traffic consideration (optional, default: 'approximated')
  traffic?: 'free_flow' | 'approximated';

  // Optimization goal (optional, default: 'time')
  optimize?: 'time' | 'distance';

  // Depot configuration (optional)
  depot?: {
    location: [number, number];  // [longitude, latitude]
    endBehavior: 'depot' | 'driver-address' | 'last-stop';
  };

  // Per-driver configuration (optional)
  driverConfig?: {
    [driverId: string]: {
      homeLocation?: [number, number];
      timeWindow?: [number, number];  // [start, end] in seconds since midnight
      capacity?: number[];
      skills?: string[];
      speedFactor?: number;  // 0.5 to 2.0
    };
  };

  // Global driver configuration (optional)
  globalDriverConfig?: {
    homeLocation?: [number, number];
    timeWindow?: [number, number];
    capacity?: number[];
    skills?: string[];
    speedFactor?: number;
  };

  // Per-stop configuration (optional)
  stopConfig?: {
    [stopId: string]: {
      serviceTime?: number;  // seconds
      delivery?: number[];
      pickup?: number[];
      skills?: string[];
      priority?: number;  // 0-100
      timeWindows?: [number, number][];
    };
  };

  // Global stop configuration (optional)
  globalStopConfig?: {
    serviceTime?: number;
    delivery?: number[];
    pickup?: number[];
    skills?: string[];
    priority?: number;
    timeWindows?: [number, number][];
  };
}
```

### Response

```typescript
{
  success: true,
  optimizedStops: [
    {
      id: string;
      organization_id: string;
      map_id: string;
      location_id: string;
      driver_id: string;           // Updated with assigned driver
      delivery_index: number;      // Updated with sequence number
      contact_name: string | null;
      contact_phone: string | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
    }
  ]
}
```

### Example Request

```bash
curl -X POST http://localhost:5173/api/maps/abc123/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "drive",
    "optimize": "time",
    "traffic": "approximated",
    "globalStopConfig": {
      "serviceTime": 300
    }
  }'
```

### Example Response

```json
{
	"success": true,
	"optimizedStops": [
		{
			"id": "stop-001",
			"organization_id": "org-456",
			"map_id": "map-789",
			"location_id": "loc-123",
			"driver_id": "driver-abc",
			"delivery_index": 1,
			"contact_name": "John Doe",
			"contact_phone": "555-0100",
			"notes": "Call before arrival",
			"created_at": "2025-10-23T10:00:00Z",
			"updated_at": "2025-10-23T10:30:00Z"
		},
		{
			"id": "stop-002",
			"organization_id": "org-456",
			"map_id": "map-789",
			"location_id": "loc-124",
			"driver_id": "driver-abc",
			"delivery_index": 2,
			"contact_name": "Jane Smith",
			"contact_phone": "555-0101",
			"notes": null,
			"created_at": "2025-10-23T10:00:00Z",
			"updated_at": "2025-10-23T10:30:00Z"
		}
	]
}
```

### Error Responses

- `401 Unauthorized` - User not authenticated
- `404 Not Found` - Map not found or doesn't belong to user's organization
- `400 Bad Request` - Invalid request or missing required data
- `500 Internal Server Error` - Optimization failed

### Notes

1. The optimization service will:
   - Query all drivers and stops for the map
   - Call the GeoApify API to optimize routes
   - Update stops table with `driver_id` and `delivery_index` fields
   - Return the list of updated stops

2. The `delivery_index` field indicates the order in which stops should be visited (starting from 1)

3. Use depot configuration to have all drivers start/end at a central location

4. Use driver/stop configurations for advanced constraints like:
   - Time windows (delivery between 9am-5pm)
   - Capacity constraints (weight, volume)
   - Skills matching (refrigerated trucks for cold items)
   - Priority stops (VIP customers first)

5. To reset optimization, set `driver_id` and `delivery_index` to null on all stops
