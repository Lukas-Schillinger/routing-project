# Driver API Documentation

API endpoints for managing drivers in the routing application.

## Validation

All endpoints use Zod schemas for request validation:

- **Create Driver**: Uses `driverCreateSchema` from `/lib/schemas/driver.ts`
- **Update Driver**: Uses `driverUpdateSchema` from `/lib/schemas/driver.ts`
- Validation errors return `400 Bad Request` with detailed error messages

## Endpoints

### List All Drivers

**GET** `/api/drivers`

Returns all drivers for the authenticated user's organization.

**Authentication Required:** Yes

**Response:**

```json
[
	{
		"id": "uuid",
		"organization_id": "uuid",
		"name": "John Doe",
		"phone": "+1234567890",
		"notes": "Experienced driver",
		"active": true,
		"temporary": false,
		"created_at": "2025-01-15T10:30:00Z",
		"updated_at": "2025-01-15T10:30:00Z"
	}
]
```

**Status Codes:**

- `200 OK` - Success
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

---

### Create Driver

**POST** `/api/drivers`

Creates a new driver for the authenticated user's organization.

**Authentication Required:** Yes

**Request Body:**

```json
{
	"name": "John Doe", // Required: string
	"phone": "+1234567890", // Optional: string
	"notes": "Experienced driver", // Optional: string
	"active": true, // Optional: boolean (default: true)
	"temporary": false // Optional: boolean (default: false)
}
```

**Response:**

```json
{
	"id": "uuid",
	"organization_id": "uuid",
	"name": "John Doe",
	"phone": "+1234567890",
	"notes": "Experienced driver",
	"active": true,
	"temporary": false,
	"created_at": "2025-01-15T10:30:00Z",
	"updated_at": "2025-01-15T10:30:00Z"
}
```

**Status Codes:**

- `201 Created` - Driver created successfully
- `400 Bad Request` - Invalid data (e.g., missing name)
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Server error

---

### Get Driver

**GET** `/api/drivers/[driverId]`

Returns a specific driver by ID.

**Authentication Required:** Yes

**Path Parameters:**

- `driverId` - UUID of the driver

**Response:**

```json
{
	"id": "uuid",
	"organization_id": "uuid",
	"name": "John Doe",
	"phone": "+1234567890",
	"notes": "Experienced driver",
	"active": true,
	"temporary": false,
	"created_at": "2025-01-15T10:30:00Z",
	"updated_at": "2025-01-15T10:30:00Z"
}
```

**Status Codes:**

- `200 OK` - Success
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Driver not found or belongs to different organization
- `500 Internal Server Error` - Server error

---

### Update Driver

**PATCH** `/api/drivers/[driverId]`

Updates an existing driver. Only provided fields will be updated.

**Authentication Required:** Yes

**Path Parameters:**

- `driverId` - UUID of the driver

**Request Body:**

```json
{
	"name": "Jane Doe", // Optional: string
	"phone": "+0987654321", // Optional: string (null to clear)
	"notes": "Updated notes", // Optional: string (null to clear)
	"active": false, // Optional: boolean
	"temporary": true // Optional: boolean
}
```

**Response:**

```json
{
	"id": "uuid",
	"organization_id": "uuid",
	"name": "Jane Doe",
	"phone": "+0987654321",
	"notes": "Updated notes",
	"active": false,
	"temporary": true,
	"created_at": "2025-01-15T10:30:00Z",
	"updated_at": "2025-01-15T14:30:00Z"
}
```

**Status Codes:**

- `200 OK` - Driver updated successfully
- `400 Bad Request` - Invalid data (e.g., empty name)
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Driver not found or belongs to different organization
- `500 Internal Server Error` - Server error

---

### Delete Driver

**DELETE** `/api/drivers/[driverId]`

Deletes a driver. Will fail if the driver is currently assigned to any routes.

**Authentication Required:** Yes

**Path Parameters:**

- `driverId` - UUID of the driver

**Response:**

```json
{
	"success": true,
	"message": "Driver deleted successfully"
}
```

**Status Codes:**

- `200 OK` - Driver deleted successfully
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Driver not found or belongs to different organization
- `409 Conflict` - Driver is assigned to routes (cannot delete)
- `500 Internal Server Error` - Server error

**Error Response (409):**

```json
{
	"message": "Cannot delete driver that is assigned to routes. Please remove the driver from all routes first."
}
```

---

## Security

All endpoints require authentication via the Lucia auth session. Requests must include a valid session cookie.

All operations are scoped to the authenticated user's organization. Users cannot access or modify drivers from other organizations.

## Database Schema

The `drivers` table has the following structure:

```typescript
{
  id: string (uuid, primary key)
  organization_id: string (uuid, foreign key)
  name: string (max 200 chars, required)
  phone: string (max 32 chars, optional)
  notes: text (optional)
  active: boolean (default: true)
  temporary: boolean (default: false)
  created_at: timestamp
  updated_at: timestamp
}
```

The `temporary` field indicates if a driver was created as a one-off for a specific map, as opposed to a permanent driver in the organization.

## Relationships

- Drivers belong to one organization
- Drivers can be assigned to multiple routes via `routes.driver_id`
- When a driver is deleted, the relationship is set to null (`onDelete: 'set null'`)
- Drivers cannot be deleted if they are currently assigned to any routes

## Zod Schemas

The following Zod schemas are defined in `/lib/schemas/driver.ts`:

### `driverSchema`

Full driver object including all database fields

### `driverCreateSchema`

Schema for creating a new driver:

```typescript
{
  name: string (min 1 char, max 200 chars, required)
  phone?: string | null (max 32 chars, optional)
  notes?: string | null (optional)
  active?: boolean (default: true)
  temporary?: boolean (default: false)
}
```

### `driverUpdateSchema`

Schema for updating a driver (all fields optional, at least one required):

```typescript
{
  name?: string (min 1 char, max 200 chars)
  phone?: string | null (max 32 chars)
  notes?: string | null
  active?: boolean
  temporary?: boolean
}
```

### `driverDisplaySchema`

Minimal schema for displaying drivers in lists:

```typescript
{
	id: string;
	name: string;
	phone: string | null;
	active: boolean;
	temporary: boolean;
}
```

### `driverWithRouteCountSchema`

Extended display schema with route count for analytics:

```typescript
{
  ...driverDisplaySchema,
  routeCount: number
}
```

### Type Exports

```typescript
import type {
	Driver, // Full driver type
	DriverCreate, // Creation type
	DriverUpdate, // Update type
	DriverDisplay, // Display type
	DriverWithRouteCount // Display with route count
} from '$lib/schemas/driver';
```
