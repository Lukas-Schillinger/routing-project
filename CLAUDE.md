## General

- This is a svelte 5 application! Make sure not to use any svelte 4 conventions like `$store()` or `export let...`
- Use shadcn-svelte components with Tailwind CSS for styling.
- Code should be as functional and avoid functions with side effects where possible.
- Ensure all pages are mobile compatible.

## DB

`src/lib/server/db/schema.ts`

- This app uses drizzle ORM with postgresql/supabase.
- Make sure types are included where relevant.

## DB Validation

`src/lib/schemas`

- Use zod for validation schemas.
- Export schemas to typescript using z.infer<>

## Server Services

`src/lib/services/server`

- These handle all DB transactions
- The db should never be called outside of services
- Tenancy is handled at the service layer using organizationId

## API Routes

`src/routes/api`

- These are used to make client side calls
- API routes should be fairly minimal and not do more than validate requests and send them to a service.
- API routes should never be called using fetch!
- Every API route needs to have permissions assigned

## API Service

`src/routes/services/api`

- Routers for making client side requests
- These are super minimal and just subclass an API client with the relevant request types.
- Just passthroughs from client side to API routes

## Permissions

`src/lib/services/server/permissions.ts`

- Use permission based auth for every API and page routes.
- Every page route needs to have a `+page.server.ts` to handle permissions.
- `requirePermissionApi` will return an HTTP error for API routes
- `requirePermission` will redirect to the login page if there isn't a user isn't logged in and return a 403 error if their permissions are insuffiecient.
- Permissions are available on the client through the root `+layout.svelte`. Use `checkPermissions` from `$lib/utils.ts` to check permissions client side.
- Only admins can modify organizations, set permissions, and invite users.
- Drivers are a special class of user that only have access to routes that have been assigned to them.

## Auth Flow

- Users log in with password or email (either OTP or magic link). Passwords are not required
