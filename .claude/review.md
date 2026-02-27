# Wend Project: Comprehensive Review

**Date:** 2026-02-27
**Overall Assessment: 6/10** — Strong architecture and genuine technical depth, but significant security vulnerabilities, missing tests in CI, and an unpolished public surface prevent this from being portfolio-ready today.

**Scope:** 13 initial review agents + 14 consistency-focused agents covering architecture, security, database, frontend, testing, error handling, TSP solver, render service, TypeScript, documentation, API design, performance, billing, and cross-cutting pattern consistency. All items verified by 13 additional verification agents reading every referenced file and line number. Additionally, 9 best-practices agents audited tool/library usage against official docs (Drizzle, SvelteKit, Zod, Stripe, Tailwind/shadcn, Auth, Superforms, Mapbox, Lambda) — findings in `.claude/best-practices-audit.md`.

---

## Table of Contents

- [Critical: Security](#critical-security)
- [Critical: Data Integrity](#critical-data-integrity)
- [Critical: Frontend (Broken Functionality)](#critical-frontend)
- [High: Architecture & Patterns](#high-architecture--patterns)
- [High: Billing](#high-billing)
- [High: Performance](#high-performance)
- [High: Testing & CI](#high-testing--ci)
- [High: Documentation & Open Source](#high-documentation--open-source)
- [Medium: Type Safety](#medium-type-safety)
- [Medium: Database](#medium-database)
- [Medium: Frontend Polish](#medium-frontend-polish)
- [Medium: Error Handling & Logging](#medium-error-handling--logging)
- [Medium: TSP Solver](#medium-tsp-solver)
- [Medium: Render Service](#medium-render-service)
- [Consistency Audit](#consistency-audit)
  - [C1. Error Handling](#c1-error-handling-patterns)
  - [C2. Form Handling](#c2-form-handling-patterns)
  - [C3. Loading State Management](#c3-loading-state-management)
  - [C4. API Route Patterns](#c4-api-route-patterns)
  - [C5. Data Fetching & Mutations](#c5-data-fetching--mutations)
  - [C6. Database Query Patterns](#c6-database-query-patterns)
  - [C7. Component Patterns](#c7-component-patterns)
  - [C8. Toast & Notifications](#c8-toast--notifications)
  - [C9. CSS & Styling](#c9-css--styling)
  - [C10. Type Definitions](#c10-type-definitions)
  - [C11. Permissions & Auth](#c11-permissions--auth)
  - [C12. API Client Services](#c12-api-client-services)
  - [C13. Zod Schemas](#c13-zod-schemas)
  - [C14. Page Server Load Functions](#c14-page-server-load-functions)
- [Recommended Priority Order](#recommended-priority-order)

---

## Critical: Security

### S1. OTP Not Invalidated After Use (Replay Attack)

**Files:** `src/lib/services/server/login-token.service.ts:73-90`, `src/routes/(app)/auth/login/+page.server.ts:136-165`

The `verifyOTP` action validates the 6-digit OTP and creates a session, but never deletes the login token. The same 6-digit OTP remains valid in the database until it expires (15 minutes). An attacker who intercepts or observes the code can replay it during the window.

Compare the magic link redemption path (`/auth/redeem/login-token/+page.server.ts`) — it also does not delete the token after use. The only place that deletes a login token is the password reset flow.

The token has only 1,000,000 possible values (10^6) with a 15-minute window.

**Fix:**
```typescript
// In loginTokenService.validateLoginToken(), delete after successful validation:
async validateLoginToken(token: string, email: string): Promise<PublicUser> {
    const loginToken = await this.getLoginTokenFromToken(token, email);
    if (!loginToken) throw ServiceError.notFound("...");
    if (TokenUtils.isExpired(loginToken.expires_at)) throw ServiceError.forbidden("...");

    // Invalidate immediately on use
    await db.delete(loginTokens).where(eq(loginTokens.id, loginToken.id));

    const user = await userService.getPublicUser(loginToken.user_id, loginToken.organization_id);
    return user;
}
```

---

### S2. Token Type Not Validated — Password Reset Token Accepted as Login Token

**Files:** `src/lib/services/server/login-token.service.ts:73-90`, `src/routes/(app)/auth/login/+page.server.ts:150`, `src/routes/(app)/auth/redeem/login-token/+page.server.ts:33`

The `validateLoginToken()` function does not check `loginToken.type`. The `login_tokens` table has two types: `'login_token'` and `'password_reset'`. A `password_reset` token can be used to authenticate as the user via the `/auth/redeem/login-token` magic link endpoint, and a `login_token` can be submitted to the password reset form to change a user's password.

**Attack scenario:** An attacker who gets access to a valid password-reset link URL (e.g., from a compromised email inbox) can use that token at the login endpoint to create a valid session without ever setting a new password.

**Fix:**
```typescript
async validateLoginToken(token: string, email: string, expectedType?: 'login_token' | 'password_reset'): Promise<PublicUser> {
    const loginToken = await this.getLoginTokenFromToken(token, email);
    if (!loginToken) throw ServiceError.notFound("...");
    if (TokenUtils.isExpired(loginToken.expires_at)) throw ServiceError.forbidden("...");
    if (expectedType && loginToken.type !== expectedType) {
        throw ServiceError.forbidden('Invalid token type');
    }
    // ...
}
```

Call sites should pass the expected type:
- `/auth/redeem/login-token`: pass `'login_token'`
- `/auth/login` verifyOTP: pass `'login_token'`
- `/auth/redeem/password-reset`: pass `'password_reset'`

---

### S3. Non-Timing-Safe Webhook Secret Comparison

**File:** `src/routes/api/webhooks/complete-optimization/+server.ts:24`

```typescript
if (authHeader !== `Bearer ${expectedToken}`) {
```

JavaScript's `!==` string comparison is not timing-safe. It short-circuits at the first differing character, leaking information about how many characters of the secret an attacker has guessed correctly.

The Stripe webhook uses `stripeClient.constructWebhookEvent()` (internally timing-safe). The Resend webhook uses `resend.webhooks.verify()` (also timing-safe). But the optimization webhook is hand-rolled and vulnerable.

**Fix:**
```typescript
import { timingSafeEqual } from 'crypto';

function timingSafeStringEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
        timingSafeEqual(aBuf, aBuf); // avoid length leakage timing
        return false;
    }
    return timingSafeEqual(aBuf, bBuf);
}

const expected = `Bearer ${expectedToken}`;
if (!timingSafeStringEqual(authHeader ?? '', expected)) {
    throw ServiceError.unauthorized('Invalid webhook authentication');
}
```

---

### S4. Invitation Uses 6-Digit OTP with 30-Day Expiry (Brute-Forceable)

**Files:** `src/lib/services/server/invitation.service.ts:109`, `src/lib/config.ts:11`

Invitations use the same `generateOTP()` (6-digit numeric, 1,000,000 possibilities) as the login OTP, but with a 30-day expiry. A distributed attack across many IPs against a known invitation email could brute-force this.

**Fix:** Use `TokenUtils.generateHex()` (32 bytes = 2^256 entropy) for invitations instead of the OTP generator. Invitations are clicked as links and don't need to be human-readable:

```typescript
const token = TokenUtils.generateHex(); // not generateOTP()
```

---

### S5. Rate Limiting Skips Auth Form Actions

**File:** `src/lib/server/rate-limit.ts:49-58`

```typescript
export function getLimiterForPath(pathname: string): RateLimiter | null {
    if (pathname === '/api/sentry-tunnel') return null;
    if (pathname.startsWith('/api/')) return apiLimiter;
    return null; // Page routes not rate-limited
}
```

Rate limiting only applies to `/api/*` routes. Login, OTP verification, and password reset are SvelteKit form actions on page routes — they bypass rate limiting entirely.

**Fix:**
```typescript
const authLimiter = createLimiter(10, 60, 'auth'); // 10 per minute

export function getLimiterForPath(pathname: string): RateLimiter | null {
    if (pathname === '/api/sentry-tunnel') return null;
    if (pathname.startsWith('/auth/login') ||
        pathname.startsWith('/auth/password-reset') ||
        pathname.startsWith('/auth/register')) {
        return authLimiter;
    }
    if (pathname.startsWith('/api/')) return apiLimiter;
    return null;
}
```

---

### S6. Admin Impersonate/Stop Has No Auth Check

**File:** `src/routes/api/admin/impersonate/stop/+server.ts`

The stop-impersonation endpoint does not call `requireAdminApi()` or any equivalent. Compare with the start endpoint which calls `requireAdminApi()`. Any authenticated user who knows the `admin-original-session` cookie exists can call this endpoint.

**Fix:** Add `requireAdminApi()` at the top of the handler.

---

### S7. Admin Pages Rely Solely on Layout for Auth

**Files:** `src/routes/admin/+page.server.ts`, `src/routes/admin/organizations/+page.server.ts`, `src/routes/admin/organizations/[id]/+page.server.ts`, `src/routes/admin/credits/+page.server.ts`, `src/routes/admin/subscriptions/+page.server.ts`

CLAUDE.md guideline: "Every page route needs to have a `+page.server.ts` to handle permissions." All five admin page loads call `adminService` directly without calling `requireAdmin()`. In SvelteKit, layout loads and page loads run in parallel, so if the layout auth is ever bypassed, pages execute without admin verification.

**Fix:** Add `requireAdmin()` to each admin `+page.server.ts` load function independently.

---

### S8. Health Endpoint Leaks Infrastructure Details Without Authentication

**File:** `src/routes/api/health/+server.ts`

The `GET /api/health` endpoint is unauthenticated and returns: application version, service names and reachability status (database, mapbox, sqs, r2), latency timings, and error messages from failed connections (e.g., "SQS environment variables not configured").

**Fix:** Return only `{ status: 'ok' }` publicly; reserve detailed response for admin-authenticated requests.

---

### S9. Password Minimum Strength Is Only 6 Characters

**File:** `src/lib/schemas/common.ts:17`

NIST SP 800-63B recommends minimum 8 characters. No complexity or common-password check.

**Fix:** Increase to `min(8)` at minimum; consider `min(10)` and `zxcvbn` library.

---

## Critical: Data Integrity

### D1. SQL Injection via `sql.raw()` with String Interpolation

**File:** `src/lib/services/server/optimization.service.ts:556-572`

UUIDs and integers are interpolated directly into a raw SQL string:

```typescript
const valuesClause = updates
    .map(
        (u) =>
            `('${u.stopId}'::uuid, '${u.driverId}'::uuid, ${u.deliveryIndex})`
    )
    .join(', ');

await db.execute(sql.raw(`UPDATE stops SET ... FROM (VALUES ${valuesClause}) ...`));
```

While inputs come from prior DB lookups and Zod validation, this pattern is inherently fragile. Any future refactor introducing external input would open a real injection vector.

**Fix:**
```typescript
const valuesRows = updates.map(
    (u) => sql`(${u.stopId}::uuid, ${u.driverId}::uuid, ${u.deliveryIndex})`
);
const valuesClause = sql.join(valuesRows, sql`, `);
await db.execute(sql`
    UPDATE stops SET driver_id = v.driver_id, delivery_index = v.delivery_index, updated_at = NOW()
    FROM (VALUES ${valuesClause}) AS v(stop_id, driver_id, delivery_index)
    WHERE stops.id = v.stop_id
`);
```

---

### D2. `delivery_index: 0` Silently Becomes `null`

**File:** `src/lib/services/server/stop.service.ts:239`

```typescript
delivery_index: data.delivery_index || null,
```

When `delivery_index` is `0` (first stop in a route), `0 || null` evaluates to `null`. Same falsy-coercion bug exists for `contact_name` and `contact_phone`.

**Fix:** Use `data.delivery_index ?? null`.

---

### D3. Cross-Org Invitation Deletion in `deleteUser`

**File:** `src/lib/services/server/user.service.ts:191`

```typescript
await db.delete(invitations).where(eq(invitations.email, user.email));
```

Deletes invitations for that email across ALL organizations. Violates tenancy enforcement.

**Fix:** Add `eq(invitations.organization_id, organizationId)` to the WHERE clause.

---

### D4. Non-Atomic Default Depot Swap (Race Condition)

**File:** `src/lib/services/server/depot.service.ts:40-55`

`createDepot` unsets the existing default depot and inserts the new one in two separate, non-transactional steps. Between these operations, concurrent requests could see no default or set their own. Same pattern in `updateDepot`.

**Fix:** Wrap `unsetDefaultDepot` + `insert/update` in `db.transaction()`.

---

### D5. Billing Idempotency Has No Unique Constraints (TOCTOU)

**Files:** `src/lib/services/server/billing.service.ts:22-33`, `src/lib/server/db/schema.ts:66-82`

`transactionExists()` does a SELECT then INSERT. No `UNIQUE` index on `stripe_payment_intent_id` or `optimization_job_id`. Two concurrent webhook deliveries for the same event can both pass the existence check and double-charge.

**Fix:**
```typescript
uniqueIndex('credit_tx_payment_intent_uidx').on(t.stripe_payment_intent_id)
    .where(sql`${t.stripe_payment_intent_id} IS NOT NULL`),
uniqueIndex('credit_tx_optimization_job_uidx').on(t.optimization_job_id)
    .where(sql`${t.optimization_job_id} IS NOT NULL`),
```

Then use `ON CONFLICT DO NOTHING` instead of the separate SELECT.

---

### D6. Concurrent Credit Check Race Condition

**File:** `src/routes/api/maps/[mapId]/optimize/+server.ts:41-48`

Two concurrent requests both call `getAvailableCredits()`, both see positive balance, both queue optimization jobs. No database-level lock or advisory lock. Additionally, the check is `availableCredits > 0` rather than `>= estimatedStopCount`, so a 1-credit org can run a 50-stop optimization and go to -49.

**Fix:** Enforce a database-level constraint at usage recording time, or use a serializable transaction with a SELECT FOR UPDATE on the organization.

---

### D7. Route Recalculation Permanently Disabled

**File:** `src/lib/services/server/stop.service.ts:401-411`

`reorderStops()` has commented-out route recalculation with a TODO saying "Re-enable after DnD testing." Routes become stale after any stop reorder. This is a functional correctness bug.

**Fix:** Re-enable the code or delete it with an explicit architectural decision comment.

---

### D8. `redeemInvitation` Calls `createUser` Outside Transaction Scope

**File:** `src/lib/services/server/invitation.service.ts:136-154`

`redeemInvitation` uses a transaction to mark the invitation as used, then calls `userService.createUser` which uses `db` directly (not `tx`). If the transaction rolls back after the user is inserted, you get a user with no corresponding used invitation.

**Fix:** Pass the transaction instance `tx` into `createUser`, or inline the user insertion using `tx.insert(users)`.

---

### D9. `getOrCreateDistanceMatrix` Has TOCTOU Race (No Unique Index)

**File:** `src/lib/services/server/optimization.service.ts:725-760`

SELECT then INSERT without a unique constraint on `(organization_id, inputs_hash)`. Two concurrent optimizations for the same stops will both call Mapbox (expensive) and both insert duplicate matrix rows.

**Fix:** Add unique index on `(organization_id, inputs_hash)` and use `.onConflictDoNothing()`.

---

### D10. Tenancy Not Enforced Atomically in Several Services

**Files:** `route.service.ts:33`, `stop.service.ts:28`, `driver.service.ts:27`, `depot.service.ts:118`

These services fetch by `id` only, then compare `organization_id` in JavaScript. Should use atomic `WHERE` with both `id` AND `organization_id` in the SQL query, consistent with other services like `deleteMap`.

---

## Critical: Frontend

### F1. Svelte 4 `$app/stores` Import in 3 Components

**Files:** `src/routes/admin/+layout.svelte:3`, `src/lib/components/billing/BillingModal.svelte:10`, `src/lib/components/billing/CreditPurchaseModal.svelte:7`

These import `page` from `$app/stores` (Svelte 4) instead of `$app/state` (Svelte 5), then use `$page.url.pathname` with the store-subscript syntax. This will silently fail to update reactively in Svelte 5.

**Fix:** Replace with `import { page } from '$app/state';` and drop the `$` prefix.

---

### F2. `$derived(() => ...)` Should Be `$derived.by()`

**Files:** `src/routes/(app)/maps/import/+page.svelte:128,140`, `src/lib/components/ui/file-upload/file-upload.svelte:169`

```typescript
const nextButtonDisabled = $derived(() => { ... }); // WRONG — value is a function
```

`$derived` wrapping a function creates a reactive reference to the function itself, not its return value. The template then calls `nextButtonDisabled()` which works at runtime but bypasses reactivity.

**Fix:** Use `$derived.by(() => { ... })` and remove `()` calls in template.

---

### F3. Mutating `$derived` Via `bind:value`

**File:** `src/routes/(app)/auth/account/ProfileInformationCard.svelte:25`

```typescript
let nameValue = $derived(user.name ?? '');
// ...
<Input type="text" bind:value={nameValue} />
```

`$derived` values are read-only in Svelte 5. `bind:value` will throw `Cannot set property nameValue` when the user types.

**Fix:** Use `$state` with an `$effect` for synchronization:
```typescript
let nameValue = $state(user.name ?? '');
$effect(() => { nameValue = user.name ?? ''; });
```

---

### F4. `w-3xl` Is Not a Valid Tailwind Class

**File:** `src/routes/(app)/auth/account/+page.svelte:73`

`w-3xl` produces no applied width. Content has no width constraint on the account page.

**Fix:** `max-w-3xl` (or `w-full max-w-3xl`).

---

## High: Architecture & Patterns

### A1. DB Accessed Directly in `/api/health`

**File:** `src/routes/api/health/+server.ts:1-8,57-59`

Directly imports `db` and `drizzle-orm`, bypassing the service layer. Violates: "The database should never be called outside of server services."

**Fix:** Create `healthService.checkDatabase()` or delegate to an existing service.

---

### A2. `requirePermissionApi` Inside `try/catch` in Invitations Route

**File:** `src/routes/api/auth/invitations/+server.ts:10-12`

The only route where the permission check is inside the `try` block. If it throws a SvelteKit `error()`, `handleApiError` catches it and produces unpredictable behavior. Every other route calls it outside/before the `try`.

**Fix:** Move `requirePermissionApi` before the `try` block.

---

### A3. Duplicate `adjustCredits` Implementation

**Files:** `src/lib/services/server/admin.service.ts:270-294`, `src/lib/services/server/billing.service.ts:241-254`

Both services have nearly identical credit transaction insert logic.

**Fix:** `adminService.adjustCredits()` should delegate to `billingService.adjustCredits()` after its org existence check.

---

### A4. `getRequestEvent()` Antipattern in Route Handlers

**Files:** `src/routes/api/routes/[routeId]/shares/+server.ts:8,46-47`, `src/routes/api/routes/[routeId]/shares/[shareId]/resend/+server.ts:6,22-23`

These routes call `getRequestEvent()` inside handlers that already receive the full `RequestEvent`. `getRequestEvent()` exists for non-request contexts.

**Fix:** Use the handler's `url` parameter directly.

---

### A5. Inconsistent Error Response Shape in 3 Routes

**Files:** `src/routes/api/maps/[mapId]/reset-optimization/+server.ts:13`, `src/routes/api/routes/[routeId]/shares/+server.ts:17,36`, `src/routes/api/routes/[routeId]/shares/[shareId]/resend/+server.ts:14-18`

Return `json({ error: '...' }, { status: 400 })` instead of `throw ServiceError.badRequest(...)`. The response shape `{ error }` is inconsistent with the standard `{ code, message }` shape.

---

### A6. `ServiceError.validation()` Used for Not-Found Conditions

**File:** `src/lib/services/server/optimization.service.ts:418,675`

Missing job is a `NOT_FOUND` (404), not `VALIDATION` (400). The webhook handler will receive a 400 and may retry, and Sentry will not capture this as unexpected (VALIDATION is in `EXPECTED_CODES`).

**Fix:** Use `ServiceError.notFound()`.

---

### A7. Demo Pages Have No Auth Checks

**Files:** `src/routes/(app)/demo/billing/+page.server.ts`, `src/routes/(app)/demo/phone-numbers/+page.server.ts`, `src/routes/(app)/demo/legacy-landing-page/+page.server.ts`

No authentication check at all. CLAUDE.md: "Every page route needs to have a `+page.server.ts` to handle permissions."

**Fix:** Add `requirePermission()` or `requireAuth()` to all demo page loads, or remove before public release.

---

### A8. `includeStats` Param Accepted But Ignored; Response Envelope Mismatch

**File:** `src/routes/api/maps/+server.ts:11-15`, `src/lib/services/api/maps.ts:29-31`

GET /api/maps parses `includeStats` but never uses it. Returns `{ maps, includeStats }` but the API client expects `Map[]`. This is a runtime type error.

**Fix:** Either implement stats or remove the dead parameter. Align response shape with client expectation.

---

### A9. `end_at_depot` Default Contradicts Schema

**File:** `src/lib/services/server/optimization.service.ts:178-181`

The Zod schema defaults `end_at_depot` to `false`, but `DEFAULT_CONFIG` sets it to `true`. The service constant overrides the schema default, so every optimization silently ends at depot.

**Fix:** Align the defaults or document the intentional override.

---

### A10. Two Service Classes in One File

**File:** `src/lib/services/server/user.service.ts`

`UserService` and organization logic are in the same file. Every other service has its own file.

---

### A11. `logout` API Route Throws Without `handleApiError`

**File:** `src/routes/api/auth/logout/+server.ts:10-12`

Directly throws `ServiceError` instead of wrapping in `try/catch` with `handleApiError`. Will result in 500 HTML error page instead of JSON.

---

### A12. Plain `Error` Instead of `ServiceError` in Services

**Files:** `src/lib/services/server/map.service.ts:158`, `src/lib/services/server/route.service.ts:508`

Throws `new Error(...)` instead of `ServiceError.validation(...)` or `ServiceError.internal(...)`. Bypasses the error handling framework, sends to Sentry as unknown error, returns 500 with fallback message.

---

### A13. `access_token_hash` Exposed in Route Share API Responses

**File:** `src/lib/schemas/route-share.ts:10-22`

`routeShareSchema` includes `access_token_hash: z.string()`. This is returned to API clients. If the hash algorithm is weak, this could allow share access bypass.

**Fix:** Create a `PublicRouteShare` type omitting `access_token_hash`.

---

## High: Billing

### B1. `cancel_at` From Stripe Portal Never Stored (Known Bug)

**File:** `src/lib/services/server/subscription.service.ts:159`

Documented in MEMORY.md but still unfixed. `syncSubscription` only reads `cancel_at_period_end`. Stripe portal sets `cancel_at` timestamp instead. UI won't show the downgrade warning.

**Fix:**
```typescript
cancel_at_period_end:
  stripeSubscription.cancel_at_period_end ||
  stripeSubscription.cancel_at != null,
```

Also add a `cancel_at` timestamp column to store the actual date.

---

### B2. Free Users Can't Buy Credits (No Stripe Customer)

**File:** `src/lib/services/server/subscription.service.ts:88-93`

Free-tier orgs that never initiated an upgrade have no `stripe_customer_id`. `createCreditPurchaseSession` throws. But the UI shows the credit purchase option to free users.

**Fix:** Create Stripe customer lazily in `createCreditPurchaseSession` (like `createUpgradeCheckout` does), or hide the option for orgs without a Stripe customer.

---

### B3. Admin Credit Balance Calculation Omits Plan Monthly Credits

**File:** `src/lib/services/server/admin.service.ts:109-127`

The admin panel sums raw credit transaction amounts but omits the plan's monthly credit grant (which is derived, not a ledger entry). Shows incorrect balance.

**Fix:** Use `billingService.getAvailableCredits(organizationId)` instead of inline SQL.

---

### B4. `trialing` Status Gets Free-Tier Credits

**File:** `src/lib/server/db/schema.ts:22`

`getOrgPlan` returns `'free'` for any status other than `'active'`, including `'trialing'`. If trials exist, trialing customers get 200 credits instead of 2000.

**Fix:** `return ['active', 'trialing'].includes(status) ? 'pro' : 'free';`

---

## High: Performance

### P1. `getBillingInfo` Called on Every Authenticated Request

**File:** `src/hooks.server.ts:105`

Every authenticated page load and API request fires a SELECT against `organizations` just to derive plan features. This includes polling calls (every 2 seconds during optimization).

**Fix:** Cache plan/features in Redis (Upstash already a dependency) with 5-minute TTL, or store on the session record.

---

### P2. `bulkCreateStops` = O(N*5) Queries

**File:** `src/lib/services/server/stop.service.ts:419-441`

For each stop in a bulk import: create/verify location (1), verify location ownership (1), verify map ownership (1), INSERT stop (1), call `getStopById` (2). For 50-stop CSV import: ~250 DB calls. Comment acknowledges this.

**Fix:** Verify map once, batch-insert locations and stops, fetch all results in single join.

---

### P3. `upsertRoute` = 4 Sequential Queries Per Route

**File:** `src/lib/services/server/route.service.ts:50-172,177-186`

Fetch map, fetch driver, fetch depot, check existing + insert/update. `upsertRoutes` loops this in a transaction. For N routes: 4N sequential queries. The bulk path (`bulkUpsertRoutesInternal`) correctly skips this.

**Fix:** Parallelize ownership checks with `Promise.all`; use `bulkUpsertRoutesInternal` where possible.

---

### P4. No Indexes on `optimization_jobs` Table

**File:** `src/lib/server/db/schema.ts:516-549`

Polled every 2 seconds during optimization. Full table scan with no composite index.

**Fix:**
```typescript
index('optimization_jobs_map_org_status_idx').on(t.map_id, t.organization_id, t.status)
```

---

### P5. No Indexes on `matrices` Table

**File:** `src/lib/server/db/schema.ts:478-490`

`getOrCreateDistanceMatrix` queries on `(organization_id, inputs_hash)` with no index.

**Fix:**
```typescript
index('matrices_org_hash_idx').on(t.organization_id, t.inputsHash)
```

---

### P6. `geocode_raw` JSONB Returned in All Stop Queries

**File:** `src/lib/services/server/stop.service.ts:52-65,94-128`

Every stop query returns the full `location` object including `geocode_raw` (hundreds of bytes per stop from Mapbox). Never displayed in the map view or stop list. For 100 stops: tens of KB of unnecessary data. Severity depends on whether any frontend code accesses this field.

**Fix:** Project only needed columns, omitting `geocode_raw`, `geocode_confidence`, `geocode_provider`, `geocode_place_id`.

---

### P7. Missing `(map_id, driver_id)` Composite Index on Stops

**File:** `src/lib/server/db/schema.ts:344-348`

`getStopsForRoute` filters on `(map_id, driver_id)`. Only separate indexes exist. Requires heap scan over all stops in a map.

**Fix:**
```typescript
index('stops_map_driver_idx').on(t.map_id, t.driver_id)
```

---

### P8. Double `getBillingInfo` Call on Map Page

**File:** `src/lib/services/server/billing.service.ts:140`, `src/routes/(app)/maps/[mapId]/+page.server.ts:44-45`

`getAvailableCredits` internally calls `getBillingInfo`, which the page load already called separately. The org row is read 3 times per map page load (hook + page + billing service internal).

**Fix:** Accept already-fetched `BillingInfo` as parameter, or create a combined method.

---

### P9. Sequential Queries That Should Be Parallel

**Files:**
- `route.service.ts:443-484` — `recalculateRouteForDriver` has 4 sequential queries, 3 are independent
- `map.service.ts:422-456` — `addDriverToMap` has 3 sequential verify queries, 2 are independent

**Fix:** Use `Promise.all` for independent queries.

---

### P10. `reorderStops` Sequential Updates Inside Transaction

**File:** `src/lib/services/server/stop.service.ts:387-399`

N sequential queries for N reordered stops.

**Fix:** Use `Promise.all` inside the transaction, or bulk VALUES approach.

---

### P11. O(N*M) Linear Searches in MapView Render Loop

**File:** `src/lib/components/map/MapView.svelte:250,274,126-134`

`hiddenDrivers.find()` and `getDriverColorById()` called per marker per render. For 100 stops and 10 hidden drivers: 1000 comparisons.

**Fix:** Derive `Set` and `Map` lookups once:
```typescript
const hiddenDriverIds = $derived(new Set(hiddenDrivers.map(d => d.id)));
const driverColorMap = $derived(new Map(drivers.map(d => [d.id, d.color])));
```

---

### P12. Unbounded Queries

**Files:**
- `location.service.ts:37-43` — `getLocations` returns all locations with no LIMIT
- `stop.service.ts:71-89` — `getStopCoordinates` unbounded org-wide fetch
- `driver.service.ts:111-119` — `deleteDriver` fetches all assigned stops (should use `.limit(1)`)
- `depot.service.ts:190-199` — `deleteDepot` fetches all routes using depot (should use `.limit(1)`)

---

### P13. `stops.sort()` Mutates Prop In-Place

**File:** `src/routes/(app)/routes/[routeId]/+page.svelte:96-99`

Should use `toSorted()` (non-mutating) as used elsewhere in the codebase.

---

## High: Testing & CI

### T1. CI Does Not Run Tests

**File:** `.github/workflows/ci.yml`

The CI pipeline runs only `npm run lint` and `npm run check` (type checking). No tests are executed. The 70% coverage thresholds in `vite.config.ts` are never enforced. The test suite could be completely broken and CI would still pass.

**Fix:** Add a test job with a postgres service container:
```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_db
    ports:
      - 5432:5432
```

---

### T2. E2E Selector Typo — Test Is Broken

**File:** `e2e/auth.spec.ts:251`

`input[name="confrim-password"]` — typo. Test targets wrong element.

**Fix:** `input[name="confirm-password"]`

Also: `REgistration Flow` has a typo in the describe block name.

---

### T3. E2E Has No Database Cleanup Between Runs

**File:** `playwright.config.ts`

No `globalSetup` or `globalTeardown`. Tests that create users (`duplicate@example.com`) will fail on second run. Also missing `baseURL` and `webServer.timeout`.

---

### T4. `admin.service.ts` Has Zero Tests

The admin service handles impersonation, organization management, and subscription sync — high-risk operations.

---

### T5. TSP Solver Has Zero Tests

**Directory:** `tsp_solver/`

Not a single test file. The solver contains non-trivial algorithmic logic (binary search for fairness, solution mapping, edge case handling).

Critical untested behaviors:
- `validate_payload` edge cases (empty matrix, non-square, NaN values)
- Binary search termination and correctness
- `map_solution` mapping for depot/start/end leg inclusion
- Zero-stops early-return path
- Error webhook path when `job_id` is `None`

---

### T6. Login Page Test Tests Nothing Meaningful

**File:** `src/routes/(app)/auth/login/page.svelte.test.ts`

Contains only static JavaScript assertions (string equality checks). Does not mount or test the Svelte component. Adds zero meaningful coverage.

---

### T7. `waitForTimeout` Flakiness in E2E

**File:** `e2e/auth.spec.ts:108,128`

Two bare `waitForTimeout(1000)` calls. Classic flakiness source. Replace with `await page.waitForURL(...)`.

---

### T8. Webhook Signature Never Tested

**File:** `src/lib/testing/mocks.ts:979-997`

`constructWebhookEvent` mock bypasses secret validation entirely. No test verifies that an invalid secret returns 401.

---

## High: Documentation & Open Source

### O1. No `.env.example`

`.gitignore` has a `!.env.example` exception, but the file doesn't exist. The README says "Copy `.env.example` to `.env`" — a cloner hits a dead end immediately. The project requires 22+ env vars across 8 services (Mapbox, Resend, Render service, Cloudflare R2, AWS SQS, Upstash Redis, Stripe, public map keys).

---

### O2. README Inadequate for Portfolio

- No demo link or screenshots (the single biggest portfolio differentiator)
- No architecture explanation or diagram (the `diagram.md` file is orphaned)
- Inaccurate setup commands (`db:push` instead of `db:generate` + `db:migrate`)
- Documents `db:studio` which CLAUDE.md warns against running
- No project description beyond one sentence
- Missing badges (build status, license, Node version)
- Missing scripts in table (`test:external`, `test:stripe`, `bench`)

---

### O3. TSP Solver Missing Essentials

- No LICENSE file
- `pyproject.toml` description: `"Add your description here"` (placeholder)
- No README content beyond what pyproject generates
- `.gitignore` doesn't ignore `.venv` (only `/venv`)
- `vroom-migration-plan.md` has stale/contradictory field names — should be deleted

---

### O4. Render Service Missing Everything

- README is boilerplate Next.js "Create Next App" content
- No LICENSE file
- No documentation of `RENDER_TOKEN_WEND` env var
- Layout metadata still says "Create Next App"
- Non-Wend email templates shipped (Stripe welcome, Vercel invite, Notion, Plaid)

---

### O5. No CONTRIBUTING.md or CODE_OF_CONDUCT.md

In any of the three repositories.

---

### O6. Package.json Metadata

- Name is `routing-project` not `wend`
- No `description` field
- No `engines` field (README says "Node.js 20+" but not enforced)

---

### O7. Dead Code in TSP Solver

**File:** `tsp_solver/solver.py`

Original OR-Tools prototype. Script (not module) that crashes on import via top-level `open("matrix.json")`. Not imported anywhere. Not excluded from Docker image (though Dockerfile only copies `main.py`).

**Fix:** Delete entirely.

---

## Medium: Type Safety

### TS1. `as Route` Casts Throughout route.service.ts

**File:** `src/lib/services/server/route.service.ts` (11 occurrences)

`Route` is `z.infer<typeof routeSchema>` where `geometry` is typed as GeoJSON, but the DB column is `jsonb` (Drizzle infers as `unknown`). Every `as Route` cast bypasses this mismatch.

**Fix:** Parse through `routeSchema` before returning, or define a dedicated `DBRoute` type.

---

### TS2. `getJobById` Returns Raw Drizzle Row as Zod Type

**File:** `src/lib/services/server/optimization.service.ts:411`

Return type annotation `Promise<OptimizationJob>` (Zod type) but returns raw `$inferSelect` where `status` is `string`. The `as JobStatus` cast on line 395 compensates.

**Fix:** Either parse through `optimizationJobSchema.parse()` or correct the return type.

---

### TS3. `as PublicUser` Casts in Permissions (LOW)

**File:** `src/lib/services/server/permissions.ts:66,79,100`

After `if (!request.locals.user)` guard, the `as PublicUser` casts may be necessary depending on how SvelteKit's `RequestEvent` types narrow through `getRequestEvent()`. The casts are defensive programming rather than suppressing real narrowing. Verify whether removing them causes type errors before changing.

**Fix:** Test removing the casts; if TypeScript narrows correctly, remove them.

---

### TS4. `mapSchema` Missing `description` Field

**File:** `src/lib/schemas/map.ts:30,40,47-56`

`createMapSchema` and `updateMapSchema` include `description` but `mapSchema` and the DB schema do not. API accepts it silently but stores nothing.

**Fix:** Remove from create/update schemas, or add to DB.

---

### TS5. Missing `cancel_at` in Schema and Type

DB schema and `organizationSchema` both lack `cancel_at` field. Stripe portal cancellation data cannot be stored.

---

### TS6. Missing Return Type Annotations on Service Methods

**File:** `src/lib/services/server/map.service.ts` (7 methods)

`getMaps`, `getDriversForMap`, `getMapsForDriver`, `addDriverToMap`, `removeDriverFromMap`, `resetOptimization`, `deleteMap` all lack explicit return types. Inconsistent with `driver.service.ts` which annotates all methods.

---

## Medium: Database

### DB1. Duplicate Migration `0024_derived_credits.sql`

**Directory:** `drizzle/`

Orphaned file that never ran (journal tracks `0024_tense_johnny_blaze.sql` instead). References a `subscriptions` table that was dropped.

**Fix:** Delete `0024_derived_credits.sql`.

---

### DB2. `inputsHash` camelCase Inconsistency

**File:** `src/lib/server/db/schema.ts:486`

Every other column uses snake_case for the JS property name. `matrices.inputsHash` uses camelCase.

**Fix:** Rename to `inputs_hash` and generate a migration.

---

### ~~DB3. `stops` Timestamps May Lack Timezone~~ — RESOLVED

Already fixed in migration `0003_careful_toad_men.sql` which explicitly alters both columns to `timestamp with time zone`.

---

### DB4. `organizations.created_by/updated_by` Lack FK References (HIGH)

**File:** `src/lib/server/db/schema.ts:89-90`

Plain `uuid` columns without `.references(() => users.id)`. Inconsistent with every other table.

---

### DB5. Missing Index on `token_hash`

**File:** `src/lib/server/db/schema.ts:203-206`

No index on `login_tokens.token_hash` or `invitations.token_hash`. Queried during login/redemption.

---

### DB6. `mailRecordSchema` Missing `error` Field

**File:** `src/lib/schemas/mail-record.ts:25-37`

DB has `error` text column but Zod schema omits it. Callers can't read the error.

---

## Medium: Frontend Polish

### FP1. `window.location.href = '/maps'` Bypasses SvelteKit

**File:** `src/routes/(app)/maps/[mapId]/+page.svelte:175`

Full page reload instead of client-side navigation. Also missing `resolve()`.

**Fix:** `await goto(resolve('/maps'))`.

---

### FP2. Hard-Coded URLs Without `resolve()`

**Files:** `src/lib/components/Header.svelte:54,62,71,75`, `src/routes/(app)/routes/[routeId]/printable/+page.svelte:41,46`, `src/routes/+error.svelte:77`

CLAUDE.md: "All URLs must use `resolve()` from `$app/paths`."

---

### FP3. `alert()` in ColumnMappingStep

**File:** `src/routes/(app)/maps/import/ColumnMappingStep.svelte:102`

CLAUDE.md: "Prefer rendering errors inline in the UI." Use `toast.error()`.

---

### FP4. `interface` Instead of `type` in 20+ Components

Convention violation. More widespread than initially estimated. Components include: `RequestMagicLogin`, `CurrentStopPanel`, `RouteTimeline`, `RouteSettingsDropdown`, `AuthCard`, `AuthAlert`, `AuthLayout`, `OptimizationOverlay`, `DebugToolbar`, `CloudflareImage`, `DriverPicker`, `PrintableRoute`, `MapBoxStaticMap`, `SphereGridLoader`, many `EditStopsDataTable` subcomponents, and others.

---

### FP5. Accessibility Issues

- Fairness toggle has no `role="group"` or `aria-pressed` (`OptimizationFooter.svelte:274-304`)
- Pagination missing `aria-current="page"` (`maps/+page.svelte:378-389`)
- Empty `alt` on visible brand logo images (`Header.svelte:38,44`, `Footer.svelte:17,23`)
- No skip-to-content link

---

### FP6. Redundant `onDestroy` in OptimizationOverlay

**File:** `src/routes/(app)/maps/[mapId]/components/OptimizationOverlay.svelte:20-40`

`$effect` return function already cleans up the interval. `onDestroy` is redundant.

---

### FP7. 1-Second Polling in RouteTimeline for Same-Tab localStorage

**File:** `src/routes/(app)/routes/[routeId]/RouteTimeline.svelte:88-89`

`setInterval(updateCompletedStops, 1000)` is unnecessary — `storage` events only fire cross-tab. Should use shared `$state`.

---

### FP8. Silent Polling Error Swallowing

**File:** `src/routes/(app)/maps/[mapId]/+page.svelte:124-127`

Polling errors are only `console.error`'d. User sees spinner indefinitely until 5-minute timeout. No consecutive failure detection.

---

### FP9. Two Icon Libraries

**File:** `package.json`

Both `lucide-svelte` (94 files) and `phosphor-svelte` (13 files) are production dependencies. Additionally `@lucide/svelte` is in devDependencies but never imported.

**Fix:** Consolidate to one library. Remove unused `@lucide/svelte`.

---

## Medium: Error Handling & Logging

### E1. `console.error` Instead of Structured Logger in Auth Pages

**Files:** `src/routes/(app)/auth/register/+page.server.ts:55`, `src/routes/(app)/auth/redeem/login-token/+page.server.ts:61`, `src/routes/(app)/auth/redeem/invitation/+page.server.ts:70`, `src/routes/(app)/auth/redeem/password-reset/+page.server.ts:96`

Should use `event.locals.log.error(...)` for request context (requestId, userId, orgId).

---

### E2. R2 Service Leaks Internal AWS Errors

**File:** `src/lib/services/external/cloudflare/r2.ts:50,67,88`

```typescript
throw ServiceError.internal(`Failed to upload file: ${error}`);
```

String interpolation includes AWS SDK error details (bucket names, account IDs) in client-facing response.

**Fix:** `throw ServiceError.internal('Failed to upload file', { cause: error });`

---

### E3. Webhook Secrets Optional But Required at Runtime

**File:** `src/lib/server/env.ts:62-64`

`OPTIMIZATION_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET` are all optional in startup validation but throw at runtime if missing.

**Fix:** Move to `requiredSchema` if webhooks are expected in production.

---

### E4. Raw Webhook Body Logged Before Validation

**File:** `src/routes/api/webhooks/complete-optimization/+server.ts:30`

```typescript
log.info({ webhookBody: body }, '[BENCH] Webhook raw payload');
```

Tagged `[BENCH]` — benchmarking code left in. Full unvalidated payload in production logs.

**Fix:** Remove or log only `jobId` and `success` after validation.

---

### E5. Client-Side Errors Not Sent to Sentry

**Files:** Multiple `.svelte` files

Caught errors are `console.error`'d but never `Sentry.captureException`'d. Note: `hooks.client.ts` does capture unhandled errors via Sentry, so this is only about explicitly caught errors in try/catch blocks that are logged to console but not forwarded to Sentry. Severity is lower than other E-items since the most critical errors (unhandled) are already captured.

---

### E6. Mail Webhook Handler Has No Structured Logging

**File:** `src/routes/api/webhooks/mail/+server.ts:11`

Doesn't destructure `locals` from event. Zero structured logging on success or error path.

---

## Medium: TSP Solver

### TSP1. Uses pyvroom Private API

**File:** `tsp_solver/main.py:263-276`

`solution._routes`, `step._step_type`, `step._location._index()` — underscore-prefixed private attributes. A pyvroom patch release could rename them.

**Fix:** Verify if public API (`solution.routes`, `step.step_type`) works in pyvroom 1.14.0.

---

### TSP2. `job_id=None` in Error Webhook Breaks Receiver

**File:** `tsp_solver/main.py:351,400-404`

If payload parsing fails, `job_id` is `None`. The SvelteKit webhook validates `job_id: z.uuid()`, so the error response is silently swallowed. Job stays permanently in `running` state.

**Fix:** Only send webhook if `job_id` is not None. Otherwise, log-only.

---

### TSP3. `start_at_depot` Parsed But Silently Ignored

**File:** `tsp_solver/main.py:37,141-148`

Accepted in schema, never read. Vehicles always start at depot regardless.

---

### TSP4. `NaN`/`Infinity` Matrix Values Bypass Validation

**File:** `tsp_solver/main.py:86-95`

`float('nan') < 0` is `False` in Python. NaN passes the check.

**Fix:**
```python
import math
if not math.isfinite(val):
    raise ValueError(f"matrix values must be finite: matrix[{i}][{j}] = {val}")
```

---

### TSP5. Deploy Pushes Both Dev and Prod From Same Branch

**File:** `tsp_solver/.github/workflows/deploy.yml:54-70`

Every push to `main` deploys to production immediately with no gate.

---

### TSP6. Baseline Solve Runs Unnecessarily for `fairness="low"`

**File:** `tsp_solver/main.py:181-199`

The single-vehicle baseline solve (can be expensive) runs even when `fairness="low"` which doesn't use the time window. Can cut solve time roughly in half for the common case.

---

### TSP7. Editable Install in Lambda Container

**File:** `tsp_solver/Dockerfile:7`

`pip install --no-cache-dir -e .` — should be `pip install --no-cache-dir .` for production.

---

## Medium: Render Service

### RS1. Boilerplate README and Layout Metadata

README is default Next.js "Create Next App" content. `layout.tsx` metadata says "Create Next App" / "Generated by create next app".

---

### RS2. Non-Wend Email Templates Shipped

**Directory:** `render-service/emails/`

`stripe-welcome.tsx`, `vercel-invite-user.tsx`, `notion-magic-link.tsx`, `plaid-verify-identity.tsx` with associated static images (logos). These are react-email examples that should be removed.

---

### RS3. Redundant Destructuring in Magic Invite

**File:** `render-service/emails/wend-magic-invite.tsx:18-22`

```typescript
invite_url: invite_url,
inviter_name: inviter_name,
```

Unnecessary aliasing.

---

### RS4. Password Reset PreviewProps Includes Field Not in Schema

**File:** `render-service/emails/wend-password-reset.tsx:68-71`

`PreviewProps` includes `token` but `PasswordResetProps` omits `token` (it uses `magicLinkPropsSchema.omit({ token: true })`). TypeScript assertion `as PasswordResetProps` hides this.

---

### RS5. wend-confirm-email.tsx Exports as `WendMagicLinkEmail`

**File:** `render-service/emails/wend-confirm-email.tsx:15`

The component is named `WendMagicLinkEmail` but it's the confirm-email template. Copy-paste error.

---

---

## Recommended Priority Order

### Week 1 — Security & Correctness (Must-Fix)

1. Invalidate tokens after use (S1, S2)
2. Fix timing-safe webhook comparison (S3)
3. Fix rate limiting to cover auth form actions (S5)
4. Add auth checks to admin pages and impersonate/stop (S6, S7)
5. Parameterize SQL in optimization service (D1)
6. Fix `delivery_index` falsy coercion (D2)
7. Add unique constraints for billing idempotency (D5)
8. Fix cross-org invitation deletion (D3)
9. Fix Svelte 5 critical bugs (F1-F4)
10. Use hex tokens for invitations (S4)

### Week 2 — CI & Testing

1. Add test job to CI with postgres service container (T1)
2. Fix E2E typo and add database cleanup (T2, T3)
3. Add basic TSP solver tests (T5)
4. Fix broken login page test (T6)

### Week 3 — Open Source Readiness

1. Create `.env.example` from env.ts (O1)
2. Rewrite README with demo, architecture diagram, accurate setup (O2)
3. Add LICENSE to companion repos (O3, O4)
4. Delete dead files (solver.py, vroom-migration-plan.md, non-Wend email templates)
5. Fix package.json metadata (O6)
6. Add CONTRIBUTING.md and CODE_OF_CONDUCT.md (O5)
7. Fix render service boilerplate (RS1, RS2, RS5)

### Week 4 — Performance & Polish

1. Cache billing info instead of querying on every request (P1)
2. Add missing database indexes (P4, P5, P7)
3. Fix the `cancel_at` Stripe portal bug (B1)
4. Batch-optimize bulkCreateStops (P2)
5. Parallelize independent queries (P9)
6. Fix type casts and schema mismatches (TS1, TS2, TS4)
7. Fix error handling inconsistencies (E1-E4, E6, A5, A6, A11, A12)
8. Fix missing org_id on DELETE operations (C6.1)
9. Address accessibility issues (FP5)
10. Consolidate icon libraries (FP9)

---

## Consistency Audit

**Date:** 2026-02-27
**Scope:** 14 specialized agents exhaustively searching every file for pattern inconsistencies — different solutions used for the same repeated task.

This section catalogs every instance where the codebase uses different patterns for the same problem. A portfolio-ready codebase should demonstrate that the developer makes a pattern decision once, then applies it uniformly.

---

### C1. Error Handling Patterns

#### C1.1 Raw `throw new Error()` vs `ServiceError` factory methods (HIGH)

CLAUDE.md mandates `ServiceError` factory methods in services. Three files still throw raw errors:

- `src/lib/services/server/route.service.ts:508` — `throw new Error('No route returned from Mapbox')`
- `src/lib/services/server/map.service.ts:158` — `throw new Error('Stop must have either location_id or location')`
- `src/lib/services/server/mail.service.ts:64` — `throw new Error('Resend API key is required...')`

#### C1.2 Inconsistent `instanceof` checks in catch blocks (MEDIUM)

Client-side error handlers check different types for the same purpose:

- `maps/+page.svelte:51-60` — checks `instanceof ServiceError`
- `auth/account/+page.svelte:56-59` — checks `instanceof Error`
- `admin/organizations/[id]/+page.svelte:54-56` — checks `instanceof Error`

**Standard:** Client code calling API service clients should check `ServiceError`. Code calling raw `fetch()` should check `Error`.

#### C1.3 Three error display patterns on client (MEDIUM)

| Pattern | Used In |
|---------|---------|
| `<div class="bg-destructive/10">` inline | EditOrCreate* popovers, OptimizationFooter |
| `<AuthAlert>` component | Auth pages (login, register, password-reset) |
| `<Alert.Root variant="destructive">` | CreateInvitationPopover |

These should converge to two patterns max: AuthAlert for auth pages, inline div for everything else.

#### C1.4 `console.error()` usage inconsistent in page server files (LOW)

Some auth pages log errors with `console.error()` (register, redeem/*), while similar pages (login, password-reset) don't. Should use `event.locals.log` consistently per CLAUDE.md.

#### C1.5 Silent error swallowing (LOW)

- `routes/[routeId]/CurrentStopPanel.svelte:66-68` — logs error but gives no user feedback
- `auth/login/+page.server.ts:98-100` — swallows errors completely (intentional for email enumeration, but undocumented)

---

### C2. Form Handling Patterns

#### C2.1 Superforms vs manual state management (HIGH)

| Pattern | Forms Using It |
|---------|---------------|
| Superforms (`$submitting`, validators, `use:enhance`) | EditOrCreateDriver, EditOrCreateMap, CreateInvitation, LoginWithPassword, Register, PasswordReset, RedeemPasswordReset |
| Manual `$state` + native `enhance` | RequestMagicLogin (explicitly opted out — comment on lines 1-5) |

**Issue:** RequestMagicLogin intentionally avoids superforms but creates inconsistency with the identical LoginWithPassword form.

#### C2.2 Two different field component systems (HIGH)

- **`Form.*` components** (`$lib/components/ui/form`): EditOrCreateDriver, LoginWithPassword, Register, PasswordReset, CreateInvitation
- **`Field.*` components** (`$lib/components/ui/field`): EditOrCreateMap
- **Plain Input/Label** (no wrapper): RequestMagicLogin

EditOrCreateMap should migrate to `Form.*` components.

#### C2.3 Client validator inconsistency (MEDIUM)

- Most superforms use `validators: zod4Client(schema)`
- EditOrCreateMap uses `validators: zod4(schema)` (no `Client` adapter)

#### C2.4 Form reset patterns (MEDIUM)

| Pattern | Used In |
|---------|---------|
| `Object.assign($formData, getInitialData())` | EditOrCreateMap |
| `form.reset()` (superforms built-in) | CreateInvitation |
| No reset at all | EditOrCreateDriver |
| Manual field clearing `code = ''` | RequestMagicLogin |

**Standard:** Use `form.reset()` for superforms-based forms.

#### C2.5 Inconsistent `novalidate` attribute (LOW)

Auth pages set `novalidate` on forms (to prevent browser validation conflicting with superforms). Popover forms don't. Should be consistent.

---

### C3. Loading State Management

#### C3.1 Variable naming (MEDIUM)

| Name | Used In |
|------|---------|
| `isSubmitting` | 13+ components (forms) |
| `isLoading` | DriverPicker, ConfirmDeleteDialog, BillingModal, CreditPurchaseModal |
| `isSyncing` | admin/organizations/[id] |
| `isResetting` | OptimizationFooter |
| `isChangingDepot` | OptimizationFooter |
| `isDeleting` | admin/organizations/[id] |
| `$submitting` | Superforms-based forms (auto-managed) |

**Standard:** `isSubmitting` for form submissions, `isLoading` for data fetching, specific names (`isResetting`, `isDeleting`) for disambiguating multiple actions in one component.

#### C3.2 Three different spinner icons (MEDIUM)

| Icon | Used In |
|------|---------|
| `Loader2` (lucide) | 15+ components — OptimizationFooter, auth pages, EditOrCreateDriver |
| `LoaderCircle` (lucide) | EditOrCreateDepot, EditOrCreateStop, ConfirmDeleteDialog |
| `Spinner` (custom) | BillingModal, CreditPurchaseModal |

**Standard:** Use `Loader2` everywhere.

#### C3.3 Admin forms missing spinners (LOW)

- `admin/credits/+page.svelte:177` — shows "Submitting..." text, no icon
- `admin/organizations/[id]/+page.svelte:520` — shows "Adjusting..." text, no icon

All other forms pair text changes with spinner icons.

---

### C4. API Route Patterns

#### C4.1 Response wrapping inconsistency (HIGH)

| Pattern | Routes |
|---------|--------|
| Bare data: `json(drivers)` | `/drivers`, `/depots`, `/stops` |
| Wrapped: `json({ map })` | `/maps/[mapId]` GET, PATCH |
| Wrapped: `json({ shares })` | `/routes/[routeId]/shares` |

POST 201 responses are similarly split — some return bare objects, some wrap them.

**Standard:** Always wrap: `json({ driver })`, `json({ map })`, etc.

#### C4.2 `return json({ error })` vs `throw ServiceError` (HIGH)

Five route share routes return error JSON directly instead of throwing:

- `routes/[routeId]/shares/+server.ts:17,36`
- `routes/[routeId]/shares/[shareId]/+server.ts:14-16`
- `routes/[routeId]/shares/[shareId]/revoke/+server.ts:14-16`
- `routes/[routeId]/shares/[shareId]/resend/+server.ts:14-16`

All other routes throw `ServiceError.*()` and let `handleApiError` format the response.

#### C4.3 Webhook success response shape (LOW)

- `/webhooks/stripe` returns `{ received: true }`
- `/webhooks/complete-optimization` returns `{ success: true }`
- `/webhooks/mail` returns `{ success: true }`

#### C4.4 DELETE response shape (LOW)

- Some DELETE routes return `json(result)` (service return value)
- Others return `json({ success: true })`
- `billing/downgrade` DELETE returns `json({ ok: true })`

#### C4.5 Missing logging in CRUD routes (MEDIUM)

`maps/[mapId]/optimize` and webhook routes use `locals.log`. All standard CRUD routes (drivers, depots, stops, maps) have zero logging.

#### C4.6 Parameter extraction timing (LOW)

Some routes destructure params before the try block, some inside it. Some validate IDs before try, some inside. `reset-optimization` returns error JSON for invalid ID instead of throwing.

---

### C5. Data Fetching & Mutations

#### C5.1 Admin pages use raw `fetch()` instead of API service clients (HIGH)

6 files make raw `fetch()` calls instead of using API service wrappers:

- `(app)/+layout.svelte:18` — `/api/admin/impersonate/stop`
- `admin/organizations/+page.svelte:45` — `/api/admin/accounts`
- `admin/organizations/[id]/+page.svelte:38,99,131,172` — 4 different admin endpoints
- `admin/credits/+page.svelte:64` — `/api/admin/credits/adjust`

**Fix:** Create `adminApi` service client in `src/lib/services/api/admin.ts`.

#### C5.2 Callback naming inconsistency (MEDIUM)

| Pattern | Used In |
|---------|---------|
| `onSuccess(entity)` — returns created/updated entity | EditOrCreate* components |
| `onCreateSuccess(stop)` — prefixed with action | TempPinMarker, TempPinPopup |
| `onCreateInvitation(invitation)` — full action name | CreateInvitationPopover |
| `onUpdate() / onCreate() / onDelete()` — void callbacks | StopsTab, EditStopsDataTable |
| `onDeleteInvitation()` — full action name, void | InvitationsCard |

**Standard:** Use `onSuccess(entity)` for creation/edit in popovers. Use `onDelete`/`onCreate`/`onUpdate` void callbacks for table row actions. Keep naming short.

---

### C6. Database Query Patterns

#### C6.1 Missing `organization_id` on DELETE operations (CRITICAL)

5 services perform DELETE without filtering by `organization_id` in the WHERE clause:

- `depot.service.ts:206` — `delete(depots).where(eq(depots.id, depotId))`
- `driver.service.ts:121` — `delete(drivers).where(eq(drivers.id, driverId))`
- `stop.service.ts:331` — `delete(stops).where(eq(stops.id, stopId))`
- `route-share.service.ts:264` — `delete(routeShares).where(eq(routeShares.id, shareId))`
- `invitation.service.ts:58` — `delete(invitations).where(eq(invitations.id, invitationId))`

All call a `getXxxById()` method first that validates org, but the actual DELETE doesn't enforce it. `location.service.ts:145-152` shows the correct pattern with `and(eq(id), eq(organization_id))`.

#### C6.2 Missing audit fields on inserts (MEDIUM)

- `route.service.ts:193-217` — `bulkUpsertRoutesInternal()` missing `created_by`/`updated_by`. The `routes` table has these columns but the bulk insert omits them. This is a real bug.

Note: `file.service.ts`, `mail-record.service.ts`, and `billing.service.ts` were originally listed here but their tables (`files`, `mail_records`, `credit_transactions`) intentionally lack `created_by`/`updated_by` columns in the schema. Those are schema design decisions, not code bugs.

#### ~~C6.3 Missing `updated_at` on UPDATE operations~~ — FALSE POSITIVE, REMOVED

The `mail_records` and `login_tokens` tables do not have `updated_at` columns, so they cannot be set. `route-share.service.ts` consistently sets `updated_at` on all its updates (lines 73 and 222). This item was incorrect.

#### C6.4 Raw SQL in optimization service (LOW)

`optimization.service.ts:563-572` uses `db.execute(sql.raw(...))` for bulk stop updates. All other services use Drizzle builder pattern. This is likely a performance optimization but should be documented.

#### C6.5 Inconsistent delete return types (LOW)

Most delete operations return `{ success: boolean }`. Some return `void`. Some return nothing explicit.

---

### C7. Component Patterns

#### C7.1 Responsive detection: IsMobile vs MediaQuery (LOW)

- `EditOrCreateDriverPopover` uses `new IsMobile()` with `!isMobile.current` to show Popover
- All other responsive popovers use `new MediaQuery('(min-width: 768px)')` with `isDesktop.current`

The logic is NOT inverted — `!isMobile.current` is equivalent to `isDesktop.current` — both correctly show Popover on desktop. The inconsistency is purely which API is used. `IsMobile` extends `MediaQuery` with `max-width: 767px` and was likely copied from the shadcn-svelte sidebar component.

#### C7.2 Snippet typing inconsistency (MEDIUM)

- EditOrCreateDriver/Map: `children?: Snippet<[{ props: Record<string, unknown> }]>` — typed with props
- EditOrCreateDepot/Stop: `children?: Snippet` — no props

These are structurally identical components with different snippet interfaces.

#### C7.3 Empty state patterns (MEDIUM)

| Pattern | Used In |
|---------|---------|
| `<Empty.Root>` with `Empty.Header/Media/Title/Description` | EditStopsDataTable, DriversTab |
| Custom `<div>` with icon + text | maps/+page.svelte, DepotsCard |
| Inline `<p>` text | MapCard |

**Standard:** Use the `Empty.*` component system everywhere.

#### C7.4 Dialog/Popover state management (LOW)

- Some popovers use `bind:open` + `onOpenChange` callback
- EditOrCreateMap and EditOrCreateDriver only use `bind:open` (no `onOpenChange`)
- `ConfirmDeleteDialog` uses `Dialog.Root bind:open` with snippet-based trigger

---

### C8. Toast & Notifications

#### C8.1 Success message format inconsistency (MEDIUM)

| Format | Examples |
|--------|---------|
| "[Entity] [past-tense verb]" | "Driver removed", "Map deleted", "Depot deleted" |
| "[Entity] [past-tense verb] [adverb]" | "Routes reset successfully", "Credits adjusted successfully" |
| "[Past-tense verb] to [noun]!" | "Upgraded to Pro!" |
| "Capitalization issues" | "Stop Deleted" (capital D), "Map ID copied" vs "Map ID copied to clipboard" |

**Standard:** `"[Entity] [past-tense verb]"` — "Driver removed", "Routes reset", "Stop deleted".

#### C8.2 Error message format inconsistency (MEDIUM)

| Pattern | Examples |
|---------|---------|
| Simple string | `toast.error('Failed to reset routes')` |
| Title + description | `toast.error('Optimization failed', { description: error })` |
| Variable message only | `toast.error(message)` |
| Generic "Error" title | `toast.error('Error', { description: message })` |

**Standard:** Use `toast.error('Failed to [action]')` for simple cases. Use `toast.error('Action failed', { description })` when the error message from the server is useful to show.

#### C8.3 Dual error display in OptimizationFooter (LOW)

Sets inline `error` state AND calls `toast.error()` for some failures, potentially showing the same error twice.

#### C8.4 Missing success notifications (LOW)

- `DriversTab` create/edit callbacks — no toast after driver created/edited in map context
- `DepotsCard` create callback — no toast
- `DriversCard` create callback — no toast

#### C8.5 No `toast.promise()` usage (LOW)

The codebase never uses `toast.promise()` for async operations. This could improve UX for optimization, deletion, and form submission flows by showing loading → success/error automatically.

---

### C9. CSS & Styling

#### C9.1 Error message styling inconsistency (MEDIUM)

- EditOrCreate* popovers: `rounded-md bg-destructive/10 p-3 text-sm text-destructive`
- OptimizationFooter: `px-2.5 py-1.5 text-xs text-destructive`

Different padding and text size for the same visual pattern.

#### C9.2 Button height inconsistency (MEDIUM)

Primary action buttons use `h-11`, `h-10`, `h-9` interchangeably. Within the same page, buttons that should be the same size use different heights.

#### C9.3 Border radius inconsistency (LOW)

Most cards use `rounded-lg`. Landing page cards use `rounded-sm`. Should standardize.

#### C9.4 Shadow inconsistency (LOW)

Cards use `shadow-sm`, `shadow-md`, `shadow`, and custom shadows interchangeably. No clear hierarchy.

#### C9.5 Dark mode coverage gaps (LOW)

Landing page components have thorough dark mode variants. App components largely rely on shadcn defaults. Some custom styling (backgrounds, borders) won't adapt.

#### C9.6 Transition duration inconsistency (LOW)

Animations use `duration-100` through `duration-700` with no clear pattern. Landing hero uses 600-700ms, other sections use 300-500ms for similar effects.

---

### C10. Type Definitions

#### C10.1 `interface` used instead of `type` (MEDIUM)

CLAUDE.md says prefer `type`. 5 interfaces found across 4 files:

- `src/lib/services/external/client/apple-maps.ts:5` — `interface AppleMapsDirectionsOptions`
- `src/lib/services/external/client/google-maps.ts:5` — `interface GoogleMapsDirectionsOptions`
- `src/lib/services/external/mapbox/distance-matrix.ts:8` — `interface CoordinatesData`
- `src/lib/services/external/mapbox/distance-matrix.ts:18` — `interface DistanceMatrixResult`
- `src/lib/services/api/maps.ts:14` — `interface DriverMembership`

#### C10.2 `nullable().optional()` vs `.nullish()` inconsistency (MEDIUM)

Stop schemas use `.nullable().optional()` chains. User schemas use `.nullish()`. Both produce equivalent TypeScript types (`T | null | undefined`). The inconsistency is purely stylistic — `.nullish()` is more concise but they behave identically for simple field definitions. Standardize on `.nullish()` for brevity.

#### C10.3 Type naming: Response vs Result vs Data vs Payload (MEDIUM)

`optimization.service.ts` alone uses all four suffixes: `OptimizationConfig`, `MatrixPayload`, `OptimizationResult`, `OptimizationResponse`. No convention documented.

#### C10.4 Component prop definition patterns (LOW)

- EditOrCreateDriver: Discriminated union with `never` type for exclusive mode
- EditOrCreateDepot/Stop: Simple optional props
- Same components, different type safety levels.

---

### C11. Permissions & Auth

#### C11.1 Admin pages rely solely on layout-level check (MEDIUM)

5 admin page routes (`/admin/`, `/admin/organizations/`, `/admin/organizations/[id]/`, `/admin/credits/`, `/admin/subscriptions/`) call `adminService` methods but don't call `requireAdmin()` themselves. They rely entirely on `admin/+layout.server.ts` calling `requireAdmin()`.

**Fix:** Add `requireAdmin()` to each page load for defense-in-depth.

#### C11.2 Demo pages inconsistent permission levels (LOW)

- `/demo/dnd` requires `requirePermission('resources:read')`
- `/demo/billing` and `/demo/phone-numbers` have no permission check at all

#### ~~C11.3 `/api/auth/users/me` mixed auth methods~~ — BY DESIGN, REMOVED

- PATCH uses `requireAuth()` — any authenticated user can update their own profile
- DELETE uses `requirePermissionApi('users:delete')` — only admins can delete accounts

This is correct security modeling, not an inconsistency. Updating your own name is a different permission level from deleting a user account.

---

### C12. API Client Services

#### C12.1 Unused `routeShareApi` service (MEDIUM)

`src/lib/services/api/route-shares.ts` — entire service class defined, exported as singleton, but imported and used by zero files. Dead code.

#### C12.2 Response unwrapping inconsistency (MEDIUM)

- `maps.ts:getDrivers()` — unwraps `{ memberships }` before returning
- `maps.ts:getById()` — returns wrapped `{ map }`
- `drivers.ts:getAll()` — returns bare `Driver[]`
- `geocoding.ts:autocomplete()` — unwraps `{ features }` before returning

No consistent pattern for whether the client or the caller unwraps.

#### C12.3 Query parameter construction (LOW)

- `maps.ts:getAll()` — manual string concatenation `\`/maps${params}\``
- `geocoding.ts` — properly uses `apiClient.get(url, params)` with object

The `apiClient.get()` method accepts a params object, but `maps.ts` doesn't use it.

#### C12.4 `billing.ts:cancelScheduledDowngrade()` returns void (LOW)

All other mutation methods return typed response objects. This one discards the response.

---

### C13. Zod Schemas

#### C13.1 `routeSchema` name collision (HIGH)

Two different schemas with the same exported name:

- `src/lib/schemas/route.ts` — database model schema for routes
- `src/lib/services/server/optimization.service.ts:104-108` — optimization result route schema

Both are exported. Importing both in one file would collide. Currently no code imports both in the same file, so this is a naming time bomb rather than an active bug. Severity is HIGH (not CRITICAL) since it would produce a compile-time error, not a silent failure.

**Fix:** Rename optimization version to `optimizedRouteSchema`.

#### C13.2 Schemas scattered outside `src/lib/schemas/` (HIGH)

- `optimization.service.ts:86-144` — 6 schemas defined inline
- `src/lib/services/external/mapbox/types.ts:4-200+` — 15+ schemas

These should live in `src/lib/schemas/` per the project's own architecture.

#### C13.3 Shared schema not reused (MEDIUM)

- `map.ts:14` defines `contact_phone: z.string().max(32).nullable().optional()` inline — doesn't use the shared `phoneSchema` (which includes E.164 transform and validation)
- `stop.ts:63` defines `notes: z.string().nullable()` — doesn't use the shared `notesSchema` (which includes trim and empty-to-null transform)

Lost transforms when fields are defined inline instead of reusing shared schemas.

#### C13.4 `geoJsonLineStringSchema` duplication (MEDIUM)

Defined in both `src/lib/schemas/route.ts` (private, uses raw array) and `src/lib/services/external/mapbox/types.ts` (exported, uses coordinate tuple). Same semantic schema, different implementations.

#### C13.5 Schema naming convention inconsistency (LOW)

| Convention | Examples |
|-----------|---------|
| `{action}{Noun}Schema` | `createStopSchema`, `createMapSchema` |
| `{noun}Schema` (base) | `mapSchema`, `stopSchema`, `routeSchema` |
| `{noun}Schema` (enum) | `roleEnum`, `jobStatusEnum` |
| Exception | `geocodeConfidenceSchema` (should be `geocodeConfidenceEnum`) |

The naming is more consistent than initially assessed. Base schemas use `{noun}Schema`, CRUD schemas use `{action}{Noun}Schema`. The main inconsistency is between `$lib/schemas/` (follows a clear pattern) and inline optimization schemas (follow their own pattern — addressed in C13.2).

#### C13.6 `.parse()` vs `.safeParse()` in API routes (LOW)

All API routes use `.parse()` except `maps/[mapId]/optimize/+server.ts:34` which uses `.safeParse()` then manually throws. Functionally identical, but inconsistent.

#### C13.7 Import paths with `.js` extension (LOW)

`mail.service.ts` and `mail-record.service.ts` import schemas with `.js` extension. All other files omit the extension.

---

### C14. Page Server Load Functions

#### C14.1 Parameter destructuring style (LOW — acceptable variation)

| Style | Files |
|-------|-------|
| No parameters (closure over locals) | routes/, maps/, auth/account, admin/* |
| Full `event` object | auth/login, auth/register, auth/redeem/* |
| Destructured `{ params }` or `{ params, url }` | maps/[mapId], routes/[routeId], admin/organizations/[id] |

Each style matches its use case: destructure when accessing specific properties, use full `event` when passing through or accessing many properties, omit when nothing is needed. This variation is practical, not problematic — no fix needed.

#### ~~C14.2 Sequential fetches that could be parallel~~ — FALSE POSITIVE, REMOVED

`routes/[routeId]/+page.server.ts:13-37` — the sequential awaits are intentionally cascading: (1) check if route is public, (2) if not, check for valid share token, (3) if not, require authentication. Each step depends on whether the previous succeeded, with early returns. These cannot be parallelized.

#### C14.3 Error handling in load functions (MEDIUM)

| Pattern | Used In |
|---------|---------|
| catch + check `ServiceError` + throw `error()` | maps/[mapId], routes/[routeId] |
| catch + check redirect status + re-throw | auth/redeem/login-token, auth/redeem/invitation |
| catch + silently continue | maps/import |
| No try/catch at all | most simple pages |

The redirect-in-catch pattern (`if (err.status === 302) throw err`) is needed because SvelteKit throws redirects as errors, but only 2 of the pages that use `redirect()` in their load function have this guard.

#### C14.4 Conditional billing data typing (LOW)

`auth/account/+page.server.ts:46-56` returns `billing` as either an object or `null`, based on permission. Frontend must null-check but TypeScript doesn't enforce it strongly through PageData.
