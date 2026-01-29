## Workflow

- Always use the code-simplifier agent after modifying service files to ensure clarity and consistency.
- Before committing, ensure checks pass: `npm run check` (types) and `npm run lint` (ESLint). CI will reject commits that fail.
- Always prefer using test factories over manually creating test data.

## Conventions

- This is a Svelte 5 application! Make sure not to use any Svelte 4 conventions like `$store()` or `export let...`
- Use shadcn-svelte components with Tailwind CSS for styling.
- Code should be functional and avoid functions with side effects where possible.
- Ensure all pages are mobile compatible.
- Prefer type over interface. Use string literals instead of enums.
- All URLs must use the `resolve()` function from `$app/paths`. This is enforced by the linter.
  - Import: `import { resolve } from '$app/paths'`
  - Usage: `href={resolve('/dashboard')}`, `goto(resolve('/settings'))`

## Architecture Overview

The codebase follows a three-layer pattern:

```
API Routes (src/routes/api)
↓
API Service Layer (src/routes/services/api)
↓
Server Services (src/lib/services/server)
↓
Database (via Drizzle ORM)
```

Key Principle: The database should never be called outside of server services. Tenancy (organizationId) is enforced at the service layer.

## DB

`src/lib/server/db/schema.ts`

- This app uses Drizzle ORM with PostgreSQL/Supabase.
- Make sure types are included where relevant.

## DB Validation

`src/lib/schemas`

- Use Zod for validation schemas.
- Export schemas to TypeScript using `z.infer<>`

## Server Services

`src/lib/services/server`

Reference: `src/lib/services/server/driver.service.ts`

- These handle all DB transactions
- The db should never be called outside of services
- Tenancy is handled at the service layer using organizationId

Patterns:

- Services are classes with async methods
- Every query filters by `organization_id` (multi-tenancy)
- Every record includes `created_by` and `updated_by` for audit trails
- Single instances are exported at module bottom
- Use `ServiceError` for consistent error handling

Tenancy rules:

- Every service method that accesses tenant data must receive `organizationId` parameter
- Always use `.where(and(eq(resource.id, id), eq(resource.organization_id, organizationId)))` to prevent cross-tenant access
- Never trust incoming organizationId - always verify from authenticated user (`user.organization_id`)

## Error Handling

`src/lib/services/server/errors.ts`

Static factory methods:

- `ServiceError.notFound()` - 404
- `ServiceError.forbidden()` - 403
- `ServiceError.conflict()` - 409
- `ServiceError.validation()` - 400
- `ServiceError.unauthorized()` - 401
- `ServiceError.badRequest()` - 400
- `ServiceError.internal()` - 500

## API Routes

`src/routes/api`

Reference: `src/routes/api/drivers/+server.ts`

- These are used to make client side calls
- API routes should be fairly minimal and not do more than validate requests and send them to a service.
- API routes should never be called using fetch!
- Every API route needs to have permissions assigned

Rules:

- Always call `requirePermissionApi(permission)` first - it returns the authenticated user with their `organization_id`
- Pass `user.organization_id` to all service calls
- Never trust any organizationId from request body - always use the authenticated user's org
- Use Zod schemas to validate request bodies
- Handle `ServiceError` and `ZodError` separately
- Minimal logic - delegate to services

## API Service (Client)

`src/routes/services/api`

- Routers for making client side requests
- These are super minimal and just subclass an API client with the relevant request types.
- Just passthroughs from client side to API routes

## Webhooks

Reference: `src/routes/api/webhooks/complete-optimization/+server.ts`

Pattern:

1. Authentication - Verify webhook secret via Authorization header
2. Validation - Parse and validate payload with Zod schema
3. Processing - Delegate to service
4. Response - Return success/error JSON

## External Services

`src/lib/services/external`

Reference: `src/lib/services/external/mail/resend.ts`

For complex services (e.g., `src/lib/services/server/optimization.service.ts`):

- Services can have constructors for dependency injection (SQS client, etc.)
- Queue external jobs and track with status column
- Use transactions for multi-step operations
- Handle external service failures gracefully

## Permissions

`src/lib/services/server/permissions.ts`

- Use permission based auth for every API and page routes.
- Every page route needs to have a `+page.server.ts` to handle permissions.
- `requirePermissionApi` will return an HTTP error for API routes
- `requirePermission` will redirect to the login page if there isn't a user isn't logged in and return a 403 error if their permissions are insufficient.
- Permissions are available on the client through the root `+layout.svelte`. Use `checkPermissions` from `$lib/utils.ts` to check permissions client side.
- Only admins can modify organizations, set permissions, and invite users.
- Drivers are a special class of user that only have access to routes that have been assigned to them.

## Auth Flow

- Users log in with password or email (either OTP or magic link). Passwords are not required

## Testing

`src/lib/testing`

Reference: `src/lib/testing/index.ts`

- `createMock<Model>(overrides?)` - Returns plain object with fake data (no DB)
- `create<Model>(tx, overrides)` - Inserts into DB via transaction
- `createTestEnvironment(tx)` - Creates org + admin user
- `createTestRouteSetup(tx)` - Creates full route setup for optimization tests
- Service mocks for external APIs (R2, Mapbox, Resend) in `src/lib/testing/mocks.ts`
