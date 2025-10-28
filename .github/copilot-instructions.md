# Routing Project - AI Agent Instructions

## Project Overview

Multi-tenant route optimization SaaS built with **SvelteKit 2** (Svelte 5), **Drizzle ORM**, **PostgreSQL**, and **Mapbox GL**. Optimizes delivery routes using Geoapify Route Planner API.

## Architecture

### Core Domain Model

- **Organizations** → multi-tenant root entity
- **Users** → belong to organization, authenticated via session tokens (Oslo crypto)
- **Maps** → route planning workspace containing stops and driver assignments
- **Stops** → delivery points (normalized location + map-specific metadata like contact, driver assignment, delivery_index)
- **Drivers** → can be assigned to multiple maps via `driver_map_memberships` join table
- **Locations** → normalized address entities with geocoding metadata (shared across organization)
- **Depots** → starting points for route optimization

### Data Flow: Location Normalization

Addresses are **deduplicated using `address_hash`** before geocoding:

1. Stop created with raw address → `location.service.ts` hashes address
2. Check if `locations` table already has this hash for the organization
3. If exists, reuse location; if new, geocode via Mapbox/Geoapify and create location
4. Store geocoding confidence (`exact|high|medium|low`), provider, and raw response
5. Multiple stops can reference same location (e.g., multiple deliveries to same building)

### Service Layer Pattern

Three-tier architecture strictly enforced:

**Server Services** (`src/lib/services/server/`)

- Database operations via Drizzle ORM
- Business logic (optimization, CSV import)
- Export singleton instances: `depotService`, `driverService`, `mapService`, `optimizationService`, etc.
- Throw `ServiceError` (NOT `error()` from SvelteKit) for business logic failures

**API Routes** (`src/routes/api/`)

- Thin request handlers: validate auth, parse/validate input via Zod schemas, call service layer
- Pattern: `export const GET/POST/PATCH/DELETE: RequestHandler = async ({ locals, request, params })`
- Auth check: `if (!locals.user) error(401, 'Unauthorized')`
- Catch `ServiceError` → convert to HTTP status: `error(err.statusCode, err.message)`
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
3. POST to `/api/maps/[mapId]/optimize` with options (mode, traffic, optimize goal)
4. `optimization.service.ts` calls Geoapify Route Planner API
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
- **Form handling**: `sveltekit-superforms` with `zodClient` adapter (see `demo/mapbox/+page.svelte`)
- **MapView.svelte**: Custom Mapbox implementation (NOT using beyonk-group/svelte-mapbox)
  - Mounts Svelte components inside Mapbox popups via `mount(StopMapPopup, ...)`
  - Track mounted popups in Map for cleanup: `mountedPopups.forEach(({ component }) => unmount(component))`

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
- Optimization: `src/lib/services/server/optimization.service.ts`, `src/lib/services/external/geoapify/`

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier configured (run `npm run lint` and `npm run format`)
- Import order: external deps → `$lib` → relative imports
- Prefer named exports over default exports
- Service singletons: `export const fooService = new FooService()`
- Keep code functional and avoid side effects where appropriate
