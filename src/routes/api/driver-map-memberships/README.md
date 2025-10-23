# Driver-Map Membership API

API endpoints for managing driver assignments to maps.

## Endpoints

### Global Membership Endpoints

#### `GET /api/driver-map-memberships`

Get all driver-map memberships for the organization.

**Query Parameters:**

- `mapId` (optional) - Filter by map ID
- `driverId` (optional) - Filter by driver ID

**Response:**

```json
[
	{
		"id": "uuid",
		"organization_id": "uuid",
		"driver_id": "uuid",
		"map_id": "uuid",
		"created_at": "timestamp",
		"updated_at": "timestamp",
		"driver": {
			"id": "uuid",
			"name": "string",
			"phone": "string | null",
			"notes": "string | null",
			"active": "boolean",
			"temporary": "boolean"
		},
		"map": {
			"id": "uuid",
			"title": "string"
		}
	}
]
```

#### `POST /api/driver-map-memberships`

Create a new driver-map membership.

**Request Body:**

```json
{
	"driver_id": "uuid",
	"map_id": "uuid"
}
```

**Response:** (201 Created)

```json
{
	"id": "uuid",
	"organization_id": "uuid",
	"driver_id": "uuid",
	"map_id": "uuid",
	"created_at": "timestamp",
	"updated_at": "timestamp"
}
```

**Errors:**

- `404` - Driver or map not found
- `409` - Driver is already assigned to this map

---

#### `GET /api/driver-map-memberships/[membershipId]`

Get a specific membership by ID.

**Response:**

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "driver_id": "uuid",
  "map_id": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "driver": { ... },
  "map": { ... }
}
```

#### `DELETE /api/driver-map-memberships/[membershipId]`

Delete a membership by ID.

**Response:**

```json
{
	"success": true,
	"message": "Membership deleted successfully"
}
```

---

### Map-Scoped Membership Endpoints

#### `GET /api/maps/[mapId]/driver-memberships`

Get all drivers assigned to a specific map.

**Response:**

```json
[
	{
		"id": "uuid",
		"organization_id": "uuid",
		"driver_id": "uuid",
		"map_id": "uuid",
		"created_at": "timestamp",
		"updated_at": "timestamp",
		"driver": {
			"id": "uuid",
			"name": "string",
			"phone": "string | null",
			"notes": "string | null",
			"active": "boolean",
			"temporary": "boolean"
		}
	}
]
```

#### `POST /api/maps/[mapId]/driver-memberships`

Add a driver to a map.

**Request Body:**

```json
{
	"driver_id": "uuid"
}
```

**Response:** (201 Created)

```json
{
	"id": "uuid",
	"organization_id": "uuid",
	"driver_id": "uuid",
	"map_id": "uuid",
	"created_at": "timestamp",
	"updated_at": "timestamp"
}
```

**Errors:**

- `404` - Map or driver not found
- `409` - Driver is already assigned to this map

#### `DELETE /api/maps/[mapId]/driver-memberships/[driverId]`

Remove a driver from a map.

**Response:**

```json
{
	"success": true,
	"message": "Driver removed from map successfully"
}
```

**Errors:**

- `404` - Map not found or driver is not assigned to this map

---

## Usage Examples

### Add a driver to a map

```bash
curl -X POST http://localhost:5173/api/maps/{mapId}/driver-memberships \
  -H "Content-Type: application/json" \
  -d '{"driver_id": "abc-123"}'
```

### Get all drivers for a map

```bash
curl http://localhost:5173/api/maps/{mapId}/driver-memberships
```

### Remove a driver from a map

```bash
curl -X DELETE http://localhost:5173/api/maps/{mapId}/driver-memberships/{driverId}
```

### Get all memberships filtered by map

```bash
curl http://localhost:5173/api/driver-map-memberships?mapId={mapId}
```

### Get all memberships filtered by driver

```bash
curl http://localhost:5173/api/driver-map-memberships?driverId={driverId}
```

---

## Business Logic

- A unique constraint exists on `(driver_id, map_id)` - each driver can only be assigned to a map once
- All operations are scoped to the user's organization
- Deleting a driver or map will cascade delete all associated memberships
- Memberships are independent of route optimization - they define which drivers are _available_ for a map, not which stops they're assigned to
