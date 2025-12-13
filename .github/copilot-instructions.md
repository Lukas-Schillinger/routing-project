# Routing Project - AI Agent Instructions

A feature-rich data table for managing stops in an unoptimized map. Built with TanStack Table and shadcn-svelte components.## Project Overview

## FeaturesMulti-tenant route optimization SaaS built with **SvelteKit 2** (Svelte 5), **Drizzle ORM**, **PostgreSQL**, and **Mapbox GL**. Optimizes delivery routes using a custom TSP Solver API.

- **Search**: Global search across all stop fields (contact, address, phone, notes)## Architecture

- **Column Toggle**: Show/hide columns via dropdown menu

- **Include in Route**: Checkbox column to select/deselect stops for route optimization### Core Domain Model

- **Pagination**: Configurable page size (10, 20, 30, 40, 50 rows)

- **Actions Menu**: Per-row dropdown with:- **Organizations** → multi-tenant root entity
  - Copy ID to clipboard- **Users** → belong to organization, authenticated via session tokens (Oslo crypto)

  - Delete stop- **Maps** → route planning workspace containing stops and driver assignments

  - View metadata (created/updated timestamps)- **Stops** → delivery points (normalized location + map-specific metadata like contact, driver assignment, delivery_index)

- **Drivers** → can be assigned to multiple maps via `driver_map_memberships` join table

## Usage- **Locations** → normalized address entities with geocoding metadata (shared across organization)

- **Depots** → starting points for route optimization

```svelte
<script>
### Data Flow: Location Normalization

  import EditStopsDataTable from './EditStopsDataTable';

  import type { StopWithLocation } from '$lib/schemas/stop';Addresses are **deduplicated using `address_hash`** before geocoding:



  let stops: StopWithLocation[] = $props();1. Stop created with raw address → `location.service.ts` hashes address

2. Check if `locations` table already has this hash for the organization

  async function handleDelete(stopId: string) {3. If exists, reuse location; if new, geocode via Mapbox and create location

    // Delete logic4. Store geocoding confidence (`exact|high|medium|low`), provider, and raw response

  }5. Multiple stops can reference same location (e.g., multiple deliveries to same building)



  async function handleToggleInclude(stopId: string, included: boolean) {### Service Layer Pattern

    // Toggle logic

  }Three-tier architecture strictly enforced:

</script>

**Server Services** (`src/lib/services/server/`)

<EditStopsDataTable
	{stops}
	-
	Database
	operations
	via
	Drizzle
	ORM
	onDelete="{handleDelete}-"
	Business
	logic
	(optimization,
	CSV
	import)
	onToggleInclude="{handleToggleInclude}-"
	Export
	singleton
	instances:
	`depotService`,
	`driverService`,
	`mapService`,
	`optimizationService`,
	etc.
/>- Throw `ServiceError` (NOT `error()` from SvelteKit) for business logic failures
```

**API Routes** (`src/routes/api/`)

## Components

- Thin request handlers: validate auth, parse/validate input via Zod schemas, call service layer

- `data-table.svelte` - Main table component with TanStack Table configuration- Pattern: `export const GET/POST/PATCH/DELETE: RequestHandler = async ({ locals, request, params })`

- `StopActionsCell.svelte` - Actions dropdown cell component- Auth check: `if (!locals.user) error(401, 'Unauthorized')`

- `index.ts` - Default export- Catch `ServiceError` → convert to HTTP status: `error(err.statusCode, err.message)`

- Catch `ZodError` → `error(400, 'Validation error: ...')`

**Client API Services** (`src/lib/services/api/`)

- Wrap fetch calls with `ApiClient` base class (`base.ts`)
- Export singleton instances: `mapApi`, `driverApi`, `depotApi`, `geocodingApi`
- Used from Svelte components for data mutations

### Authentication

**Session-based** using Oslo crypto (NOT Lucia - legacy code comments may reference it):

- `hooks.server.ts`: Reads session cookie, validates token, sets `event.locals.user` and `event.locals.session`
- Token stored in `auth-session` cookie (30-day expiry, auto-renewed at 15-day mark)
- Server helpers: `createSession()`, `validateSessionToken()`, `requireLogin()`
- User object includes `organization_id` for multi-tenancy filtering

- Geoapify API key stored in external service configs

## Development Workflows

### Database Management

```bash
npm run db:start        # Start PostgreSQL via Docker (port 5432)
npm run db:push         # Push schema changes to DB (dev-only, no migrations)
npm run db:generate     # Generate migration files
npm run db:migrate      # Apply migrations
npm run db:studio       # Open Drizzle Studio at https://local.drizzle.studio
```

**Important**: `db:push` bypasses migrations - use for rapid prototyping only. Always run `db:generate` + `db:migrate` for production-ready changes.

### Testing

```bash
npm run test:unit       # Vitest (unit tests in src/**/*.spec.ts)
npm run test:e2e        # Playwright (e2e tests in e2e/**/*.spec.ts)
npm test                # Run both
```

- Playwright tests run against **production build** (`npm run build && npm run preview` on port 4173)
- Unit test config: `vitest-setup-client.ts` for client-side tests with `@vitest/browser`

### Schema Changes Workflow

1. Edit `src/lib/server/db/schema.ts` (Drizzle schema)
2. Update corresponding Zod schema in `src/lib/schemas/` (e.g., `depot.ts`, `driver.ts`)
3. Run `npm run db:generate` to create migration
4. Apply with `npm run db:migrate`
5. Update service layer if business logic changes

## Project-Specific Patterns

### Zod Schema Organization

- **Database schemas** in `src/lib/schemas/` mirror Drizzle types but add validation rules
- Naming: `depotSchema` (full), `depotCreateSchema` (insert), `depotUpdateSchema` (partial)
- Types exported as `type DepotWithLocation = z.infer<typeof depotSchema>`

### Multi-Tenant Data Access

**ALWAYS filter by `organization_id`** in service methods:

```typescript
await db.select().from(maps).where(eq(maps.organization_id, user.organization_id));
```

Never allow cross-tenant access - validate ownership before any mutation.

### Route Optimization Flow

1. Create map → assign drivers via `driver_map_memberships` table
2. Add stops (auto-geocodes via `location.service.ts` if needed)
3. POST to `/api/maps/[mapId]/optimize` with options (depotId, fairness, timeLimitSec, etc.)
4. `optimization.service.ts` uses **TSP Solver** with Mapbox distance matrix
5. Updates `stops.driver_id` and `stops.delivery_index` with optimized assignments
6. Frontend displays routes via `MapView.svelte` (Mapbox GL)

### CSV Import

- POST file to `/api/maps/upload`
- `csv-import.service.ts` uses PapaParse for parsing
- Required columns: `name`, `address` (optional: `phone`, `notes`)
- Creates map + stops in single transaction

### Component Patterns

- **Svelte 5 runes**: Use `$props()`, `$state()`, `$derived()` (no `export let` syntax)
- **UI components** in `src/lib/components/ui/` (shadcn-svelte style)
- **Icon Library** Use lucide-svelte icons
- **Date Formatting** Use formatDate in $lib/utils for consistent date formatting
- **Table Actions** Import table action components from `$lib/components/TableActionsDropdown.Items` (e.g., `import * as Actions from '$lib/components/TableActionsDropdown.Items'`). This provides Copy, Delete, Edit, MetadataLabel, etc. Do NOT create a separate index file in table-actions folder.
- **Form handling**: `sveltekit-superforms` with `zodClient` adapter (see `demo/mapbox/+page.svelte`)
- **MapView.svelte**: Custom Mapbox implementation (NOT using beyonk-group/svelte-mapbox)
  - Mounts Svelte components inside Mapbox popups via `mount(StopMapPopup, ...)`
  - Track mounted popups in Map for cleanup: `mountedPopups.forEach(({ component }) => unmount(component))`
- **Data Tables**: Use TanStack Table via `createSvelteTable` from `$lib/components/ui/data-table`
  - Use `renderComponent()` helper to render Svelte components in cells
  - Use `FlexRender` component in templates to render cell content
  - DropdownMenu.Trigger does NOT use asChild/builder pattern - apply classes directly to trigger element
- **Buttons**: use shadcn-svelte button component
  - variant="primary" for buttons that do something like submitting a form or optimizing a route
  - use outline buttons for UI components like data-table options
  - use secondary buttons for create/edit popovers

### Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (required for Drizzle)
- `PUBLIC_MAPBOX_ACCESS_TOKEN`: Mapbox GL access token (prefixed PUBLIC\_ for client-side access)
- Geoapify API key stored in external service configs

## Common Pitfalls

1. **Don't use `$lib` alias in Drizzle schema** - causes circular dependency issues
2. **Always await Drizzle queries** - forgot `.await` leads to silent failures
3. **Geocoding is async** - batch operations when importing multiple stops
4. **Temporary drivers** - drivers with `temporary: true` are auto-deleted when removed from map
5. **Default depot constraint** - partial unique index ensures only one `default_depot = true` per org
6. **Stop delivery_index** - nullable; only set after optimization (indicates assigned route)

## Key Files Reference

- Auth: `src/lib/server/auth.ts`, `src/hooks.server.ts`
- DB schema: `src/lib/server/db/schema.ts`
- Services: `src/lib/services/server/[entity].service.ts`
- API routes: `src/routes/api/[resource]/+server.ts`
- Optimization: `src/lib/services/server/optimization.service.ts`
- External services: `src/lib/services/external/mapbox/`

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier configured (run `npm run lint` and `npm run format`)
- Import order: external deps → `$lib` → relative imports
- Prefer named exports over default exports
- Service singletons: `export const fooService = new FooService()`
- Keep code functional and avoid side effects where appropriate
