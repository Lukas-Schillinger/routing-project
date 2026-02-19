## Commands

```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run check        # Type checking (svelte-kit sync + svelte-check)
npm run lint         # Prettier + ESLint
npm run test:unit    # Unit tests (vitest)
npm run test:external # External API tests (Stripe, R2, Mapbox)
npm run db:generate  # Generate Drizzle migration
npm run db:migrate   # Apply Drizzle migration
```

## Workflow

- Always use the code-simplifier agent after modifying service files to ensure clarity and consistency.
- Before committing, ensure checks pass: `npm run check` (types) and `npm run lint` (ESLint). CI will reject commits that fail.
- Always prefer using test factories over manually creating test data.
- Never run interactive CLI commands — Claude cannot handle interactive terminal prompts. Always pass flags to skip prompts:
  - Drizzle: prefer `npm run db:generate` then `npm run db:migrate` for schema changes. `drizzle-kit push --force` skips most prompts but may still hang on create-vs-rename column disambiguation — if it hangs, kill it and use the generate+migrate workflow instead. Avoid `drizzle-kit studio`.
  - shadcn-svelte: always pass component names directly and use `--yes` to skip confirmation (e.g., `npx shadcn-svelte@latest add button card --yes`).
- Never use `git -C` — the working directory is already the project root.

## Conventions

- This is a Svelte 5 application! Make sure not to use any Svelte 4 conventions like `$store()` or `export let...`
- Use shadcn-svelte components with Tailwind CSS for styling.
- Code should be functional and avoid functions with side effects where possible.
- Ensure all pages are mobile compatible.
- Prefer type over interface. Use string literals instead of enums.
- All URLs must use `resolve()` from `$app/paths`. Enforced by the linter.
  - `href={resolve('/dashboard')}`, `goto(resolve('/settings'))`
- Prefer rendering errors inline in the UI. Use `toast` from `svelte-sonner` only for transient confirmations (e.g. "Saved").
- Server-side logging: `event.locals.log` (Pino logger with request context, userId, orgId).
- Env vars are validated at startup via `src/lib/server/env.ts` — missing vars crash immediately.

## Architecture Overview

The codebase follows a three-layer pattern:

```
API Routes (src/routes/api)
↓
API Service Layer (src/lib/services/api)
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

`src/lib/services/server` — Reference: `driver.service.ts`

- All DB access goes through services. Every query filters by `organization_id`.
- Every record includes `created_by` and `updated_by` for audit trails.
- Never trust incoming organizationId — always use `user.organization_id` from the authenticated user.

## Error Handling

`src/lib/errors.ts`

- Use `ServiceError` static factory methods (e.g. `ServiceError.notFound()`) in services.
- Use `handleApiError(err, 'fallback message')` in API routes — handles `ServiceError`, `ZodError`, and Sentry reporting.

## API Routes

`src/routes/api` — Reference: `drivers/+server.ts`

- Minimal: validate with Zod, call `requirePermissionApi(permission)`, delegate to service, handle errors with `handleApiError`.
- Never call API routes using fetch — use API service clients instead.
- Always use `user.organization_id` from the authenticated user, never from the request body.

## API Service (Client)

`src/lib/services/api`

- Thin wrappers that compose `apiClient` (from `base.ts`) with typed methods. Just passthroughs from client to API routes.

## Webhooks

Reference: `src/routes/api/webhooks/complete-optimization/+server.ts`

Pattern:

1. Authentication - Verify webhook secret via Authorization header
2. Validation - Parse and validate payload with Zod schema
3. Processing - Delegate to service
4. Response - Return success/error JSON

## External Services

`src/lib/services/external`

Reference: `mail/render.ts` (email rendering client)

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
- Permissions are available on the client through the root `+layout.svelte`. Use `checkPermission` from `$lib/utils.ts` to check permissions client side.
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
