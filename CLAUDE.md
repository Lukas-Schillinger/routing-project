## Commands

```bash
portless $(basename $PWD) vite dev  # Dev server at <worktree>.localhost:1355 (avoids port conflicts)
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
- Always use vercel-frontend-review agent after modifying frontend files
- Before committing, ensure checks pass: `npm run check` (types) and `npm run lint` (ESLint). CI will reject commits that fail.
- Always prefer using test factories over manually creating test data.
- Never run interactive CLI commands — Claude cannot handle interactive terminal prompts. Always pass flags to skip prompts:
  - Drizzle: prefer `npm run db:generate` then `npm run db:migrate` for schema changes. `drizzle-kit push --force` skips most prompts but may still hang on create-vs-rename column disambiguation — if it hangs, kill it and use the generate+migrate workflow instead. Avoid `drizzle-kit studio`.
  - shadcn-svelte: always pass component names directly and use `--yes` to skip confirmation (e.g., `npx shadcn-svelte@latest add button card --yes`).
- Never use `git -C` — the working directory is already the project root.

### Linear Issue Workflow

Multiple Claude agents can work in parallel, each in its own worktree. Each agent is assigned a Linear area label (e.g. "Backend", "Frontend", "TSP Solver") at launch.

- **Dev server:** `portless $(basename $PWD) vite dev` — derives the name from the worktree directory. Each agent gets a unique URL at `<worktree>.localhost:1355`. Must use `vite dev` directly (not `npm run dev`) so portless can inject `--port` and `--host` flags.
- **Task picking:** Filter Linear backlog by your assigned area label. Claim by assigning to yourself and setting "In Progress". Work highest priority first.
- **Commits:** Commit per issue. Don't push or create PRs — branches are reconciled by the user at end of day.
- **Frontend verification:** After UI changes, use Claude in Chrome to verify the fix at your dev server URL. Before verifying, provision a dev account by calling `POST <dev-server-url>/api/dev/provision` — this creates a pre-populated org with maps, routes, stops, and drivers, and sets the session cookie so you're logged in immediately. Navigate to the `redirectUrl` from the response to start browsing.
- **Stay in your lane:** If an issue requires changes outside your area, comment on the issue and skip it.

> **Source:** `.claude/review.md` and `.claude/best-practices-audit.md` contain full context for review items (Review ID in issue description).

1. **Claim:** Pick an unassigned Linear issue in your area. Set status to `In Progress` immediately — before planning or exploring.
2. **Plan:** **Always use plan mode before modifying files.** Enter plan mode, explore the codebase, understand the problem, design a solution, and get approval before writing any code. Never jump straight into editing files.
3. **Verify:** Read the referenced files. Confirm the problem actually exists. The review was written by AI agents and may contain:
   - False positives (problem doesn't exist or was already fixed)
   - Wrong severity (a "critical" that's actually low-impact)
   - Wrong fix (the suggested fix is worse than the current code)
   - Symptoms of a larger structural problem (fix the root cause, not the symptom)
4. **Decide:**
   - If invalid → set status to `Canceled` with a comment explaining why
   - If it's a symptom of something bigger → comment the root cause, fix that instead
   - If valid → implement the fix
5. **Root cause:** **Always find and fix the root cause.** Never use workarounds, hacks, or suppress warnings/errors to avoid fixing the real issue. If a lint rule warns, understand why and fix the code — don't add a disable comment unless the tool genuinely can't detect the correct usage.
6. **Implement:** Follow CLAUDE.md conventions.
7. **Check:** Run `npm run check && npm run lint`. Run relevant tests if they exist.
8. **Complete:** Set status to `Done`.

## Conventions

- This is a Svelte 5 application! Make sure not to use any Svelte 4 conventions like `$store()` or `export let...`
- Use shadcn-svelte components with Tailwind CSS for styling.
- Code should be functional and avoid functions with side effects where possible.
- Icons: Use `@lucide/svelte` with individual imports for tree-shaking: `import Check from '@lucide/svelte/icons/check'`. Never use barrel imports from `lucide-svelte`. `phosphor-svelte` is only used for filled map pin icons.
- Ensure all pages are mobile compatible.
- Prefer type over interface. Use string literals instead of enums.
- All URLs must use `resolve()` from `$app/paths`. Enforced by the linter.
  - `href={resolve('/dashboard')}`, `goto(resolve('/settings'))`
- Render errors inline in the UI. Use `toast` from `svelte-sonner` only for transient confirmations (e.g. "Saved").
  - Field-level errors: `<p role="alert" class="text-sm font-medium text-destructive">{error}</p>` below the input.
  - Card/section-level errors: shadcn `<Alert variant="destructive">` component.
  - Use `role="alert"` so screen readers announce errors dynamically.
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
