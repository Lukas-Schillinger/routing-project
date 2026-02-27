# Best Practices Audit

**Date:** 2026-02-27
**Scope:** 9 specialized agents auditing tool/library usage against official documentation and community best practices. Each agent researched current docs, then read the codebase to find deviations.

**Audits performed:** Drizzle ORM, SvelteKit/Svelte 5, Zod, Stripe, Tailwind/shadcn-svelte, Supabase/Auth, Superforms, Mapbox GL JS, AWS Lambda/Python

Items that overlap with the general review (`.claude/review.md`) are noted but not duplicated. Only net-new findings are listed here.

---

## Stripe Integration

### STRIPE-1. No `invoice.payment_failed` Webhook Handler (CRITICAL)

**File:** `src/routes/api/webhooks/stripe/+server.ts:45-109`

The webhook handles checkout.session.completed, customer.subscription.created/updated/deleted — but no invoice events. When a recurring payment fails, Stripe fires `invoice.payment_failed`. Without handling it, there is no proactive mechanism to notify customers of failed payments. The subscription silently goes `past_due`.

Stripe billing docs list `invoice.payment_failed` and `invoice.payment_action_required` as critical events that must be monitored.

**Fix:** Add handlers for `invoice.payment_failed` and `invoice.payment_action_required` that trigger customer notification (email or in-app alert).

---

### STRIPE-2. No Webhook Event Deduplication (HIGH)

**File:** `src/routes/api/webhooks/stripe/+server.ts:40-109`

The event ID is logged but never recorded. Stripe warns events may be delivered more than once and does not guarantee delivery order. The subscription sync path performs unconditional UPDATEs — if a stale `subscription.updated` event arrives after a newer one, it overwrites fresh data.

**Fix:** Store processed event IDs (or timestamps per subscription) and skip events that are older than the last processed event.

---

### STRIPE-4. Lazy Stripe Customer Creation Race Condition (HIGH)

**File:** `src/lib/services/server/subscription.service.ts:33-45`

`createUpgradeCheckout()` checks if `stripe_customer_id` is null, creates a customer, then saves. No locking, no unique constraint on the column. Two simultaneous "Upgrade" clicks both see null, both create Stripe customers, last write wins. Orphaned customer in Stripe.

**Fix:** Use SELECT FOR UPDATE on the org row, or add a unique index on `stripe_customer_id` and use idempotency keys.

---

### STRIPE-6. Webhook Returns Non-2xx on Processing Failures (HIGH)

**File:** `src/routes/api/webhooks/stripe/+server.ts:112-116`

When processing fails (e.g., org doesn't exist), the handler returns 400/500. Stripe treats this as a delivery failure and retries for up to 3 days. Stripe best practices: "Return a successful 2xx status code immediately."

**Fix:** Return 200 for all acknowledged events, even on processing failure. Use Sentry for error tracking. Only return non-2xx for signature verification failures.

---

### STRIPE-3. Hardcoded `payment_method_types: ['card']` (MEDIUM)

**File:** `src/lib/services/server/subscription.service.ts:50,100`

Both checkout flows hardcode card-only payments. Stripe recommends omitting `payment_method_types` to let dynamic/automatic payment methods work (Apple Pay, Google Pay, Link, etc.).

**Fix:** Remove the `payment_method_types` parameter.

---

### STRIPE-5. No Idempotency Keys on Stripe API Mutations (MEDIUM)

**File:** `src/lib/services/external/stripe/client.ts:26-98`

No Stripe client method passes idempotency keys. Retrying after network failures can create duplicate objects.

**Fix:** Pass `{ idempotencyKey }` as options to all POST requests.

---

### STRIPE-7. Success URL Shows Toast Before Webhook Confirms Payment (MEDIUM)

**Files:** `subscription.service.ts:52`, `auth/account/+page.svelte:43-48`

The `success_url` sets `?upgraded=true`, and the page shows "Upgraded to Pro!" toast. But the subscription activates via webhook, which may not have arrived yet. User sees success toast but page data still shows Free.

**Fix:** Poll subscription status or display "processing" state until webhook confirms.

---

### STRIPE-8. `past_due` Status Immediately Drops to Free Credits (MEDIUM)

**File:** `src/lib/server/db/schema.ts:19-23`

`getOrgPlan()` returns 'pro' only when `subscription_status === 'active'`. A `past_due` subscription (Stripe is retrying payment) immediately drops to free-tier credits. Stripe considers `past_due` as still active during the dunning/retry period.

**Fix:** Treat `past_due` (and optionally `trialing`) as Pro-tier during the retry period.

---

### STRIPE-9. Admin `deleteOrganization` Silently Swallows Stripe Cancellation Errors (MEDIUM)

**File:** `src/lib/services/server/admin.service.ts:376-382`

The catch block ignores ALL errors from Stripe cancellation. If cancellation fails, the org is deleted locally but the subscription continues billing in Stripe.

**Fix:** Log the error and classify it. Network failures may be safe to ignore; auth errors indicate configuration problems.

---

### STRIPE-12. `syncSubscription` Trusts Metadata `organization_id` Without Cross-Check (MEDIUM)

**File:** `src/lib/services/server/subscription.service.ts:126-163`

The UPDATE uses `metadata.organization_id` directly. If metadata is accidentally edited in Stripe Dashboard, subscription data writes to the wrong org.

**Fix:** Look up org by `stripe_customer_id` first, then verify the `organization_id` matches.

---

### STRIPE-13. No `invoice.paid` Handler for Subscription Renewal (MEDIUM)

**File:** `src/routes/api/webhooks/stripe/+server.ts:45-109`

Credit period transitions rely on `subscription.updated` webhook delivery timing. `invoice.paid` is the definitive signal that a billing cycle completed. Was originally planned (plan.md line 620) but never implemented.

**Fix:** Add `invoice.paid` handler as secondary confirmation of period transition.

---

### STRIPE-11. No Customer Object Cleanup on Abandoned Checkout (LOW)

**File:** `src/lib/services/server/subscription.service.ts:33-67`

If user abandons checkout, the Stripe customer object persists with no subscription. No `checkout.session.expired` handler.

---

## Auth & Security

### AUTH-1. No RLS Policies on Any Database Table (HIGH)

**File:** `src/lib/server/db/schema.ts` (all tables — confirmed via drizzle migration metadata `isRLSEnabled: false`)

All 16 tables have RLS disabled. Multi-tenancy is enforced purely at the application layer. If any SQL injection (like D1), credential leak, or application bug occurs, an attacker has unrestricted access to ALL organizations' data. RLS would limit blast radius to the authenticated tenant.

**Fix:** Enable RLS with a service_role bypass policy for server-side access. At minimum, add RLS policies matching the organization_id tenancy model.

---

### AUTH-2. No Session Invalidation on Password Change (HIGH)

**File:** `src/routes/(app)/auth/redeem/password-reset/+page.server.ts:66-88`

When a user resets their password, existing sessions are NOT invalidated. An attacker who compromised the old password can continue using previously established sessions for up to 30 days. No `invalidateAllUserSessions()` function exists.

**Fix:** Add `invalidateAllUserSessions(userId)` and call it on password change. Requires a user_id index on the session table (see AUTH-5).

---

### AUTH-4. Email Not Case-Normalized (MEDIUM)

**Files:** `src/lib/schemas/common.ts:5-14`, `src/lib/server/db/schema.ts:123`

The email column is plain text (case-sensitive in PostgreSQL). No `.toLowerCase()` transform in the schema. Login token lookups by email could fail if casing doesn't match.

**Fix:** Add `.transform(e => e.toLowerCase())` to `emailSchema`, or use `citext` column type.

---

### AUTH-5. Session Table Lacks `user_id` Index (MEDIUM)

**File:** `src/lib/server/db/schema.ts:137-146`

The session table has only a primary key on `id`. No index on `user_id`. Any per-user session query (needed for AUTH-2's bulk invalidation) requires a full table scan.

**Fix:** Add index on `session.user_id`.

---

### AUTH-6. 30-Day Sessions Without Step-Up Auth for Sensitive Actions (MEDIUM)

**Files:** `src/lib/config.ts:2-5`, `src/lib/services/server/auth.ts:63-75`

Sessions last 30 days and auto-renew. No re-authentication required for password changes, billing operations, or role modifications. A stolen session token has unlimited access for the full duration.

---

### AUTH-7. Impersonation Cookie Not Scoped to Admin Path (MEDIUM)

**File:** `src/routes/api/admin/impersonate/start/+server.ts:39-44`

The `admin-original-session` cookie is set with `path: '/'`. The admin's real session token is transmitted with every HTTP request to the entire application.

**Fix:** Set `path: '/api/admin/impersonate'`.

---

### AUTH-9. No Expired Session/Token Cleanup Mechanism (LOW)

**Files:** `src/lib/server/db/schema.ts` (session and login_tokens tables)

Expired sessions are only deleted one-at-a-time when presented. Expired login tokens accumulate indefinitely. No scheduled cleanup job.

---

### AUTH-10. No Authenticated Password Change Flow (LOW)

**File:** `src/routes/(app)/auth/password-reset/+page.server.ts`

Only an email-based "forgot password" flow exists. An authenticated user cannot change their password without going through the email reset flow. No "change password" form that verifies the current password.

---

## SvelteKit & Svelte 5

### SVELTEKIT-6. Excessive `invalidateAll()` Usage (HIGH)

**File:** `src/routes/(app)/maps/[mapId]/+page.svelte` (12+ calls), 40+ calls across codebase

Every mutation calls `invalidateAll()`, which re-runs ALL active load functions. The map detail page's load makes 9 parallel DB queries. After updating a single stop, all 9 queries re-run.

**Fix:** Use `depends('app:stops')` in load functions and `invalidate('app:stops')` in callbacks for targeted invalidation.

---

### SVELTEKIT-8. `$effect` Used to Sync Derived State to Parent (MEDIUM)

**File:** `src/routes/(app)/maps/import/ColumnMappingStep.svelte:54-56`

`$effect(() => { onCanProceedChange?.(canProceed); })` watches a derived value and calls a parent callback. The Svelte 5 docs call this "synchronizing state" anti-pattern.

**Fix:** Use `$bindable` or lift the derivation to the parent.

---

### SVELTEKIT-10. Legacy Svelte 4 Writable Store for Cross-Page Data (MEDIUM)

**File:** `src/lib/stores/pending-import.ts`

Uses `writable` from `svelte/store` with a manual `consume()` subscribe/unsubscribe pattern. In Svelte 5, shared reactive state should use `$state` in a `.svelte.ts` file.

**Fix:** Migrate to a `.svelte.ts` module with `$state`, or use `goto('/import', { state: { ... } })`.

---

### SVELTEKIT-11. Manual Polling Instead of SSE/Streaming (MEDIUM)

**File:** `src/routes/(app)/maps/[mapId]/+page.svelte:83-127`

Optimization status polled via `setInterval` every 2 seconds (up to 150 requests over 5 minutes). SvelteKit supports streaming promises and SSE.

---

### SVELTEKIT-12. Redundant Null Check on Guaranteed Route Params (LOW)

**Files:** `src/routes/(app)/maps/[mapId]/+page.server.ts:20-22`, `src/routes/api/maps/[mapId]/+server.ts:11-13`

`if (!mapId)` after destructuring `params.mapId`. SvelteKit guarantees `[paramName]` segments are always present as non-empty strings.

---

## Drizzle ORM

### DRIZZLE-2. Manual SELECT-then-INSERT Upsert Instead of `onConflictDoUpdate` (HIGH)

**File:** `src/lib/services/server/route.service.ts:101-146`

Classic TOCTOU race. Two concurrent requests can both see no existing route and both INSERT. The catch block handles the constraint violation, but the first request's work is lost. The same file already uses `onConflictDoUpdate` correctly in `bulkUpsertRoutesInternal` (line 196-217).

**Fix:** Use `onConflictDoUpdate` with `target: [routes.map_id, routes.driver_id]`.

---

### DRIZZLE-3. Manual Check-then-Insert in `addDriverToMap` (MEDIUM)

**File:** `src/lib/services/server/map.service.ts:431-456`

TOCTOU race on driver-map membership. Two concurrent requests both pass the existence check and both INSERT.

**Fix:** Use `onConflictDoNothing` with the unique index.

---

### DRIZZLE-4. Inconsistent `$onUpdate` Usage for `updated_at` (MEDIUM)

**File:** `src/lib/server/db/schema.ts:159`

Only the invitations table uses `$onUpdate(() => new Date())`. All other 14 tables require manual `updated_at: new Date()` on every update call (~25 times across services).

---

### DRIZZLE-5. Full-Row Fetch for Existence Checks (MEDIUM)

**Files:** `driver.service.ts:111-114`, `depot.service.ts:190-198`

Existence checks fetch ALL columns of ALL matching rows just to check `.length > 0`. Should be `select({id}).limit(1)`.

---

### DRIZZLE-6. Inconsistent Org Tenancy Enforcement Pattern (MEDIUM)

**Files:** `driver.service.ts:26-41`, `route.service.ts:32-48`, `stop.service.ts:26-42`, `map.service.ts:44-60`, `depot.service.ts:117-136`

Some methods fetch by ID only, then compare `organization_id` in app code (leaking exists-vs-forbidden distinction). Other methods include `organization_id` in the WHERE clause. The codebase's own CLAUDE.md says "Every query filters by organization_id."

**Fix:** Standardize on including `organization_id` in all WHERE clauses.

---

### DRIZZLE-7. `sql` Template for DESC Instead of `desc()` Helper (LOW)

**Files:** `map.service.ts:70`, `billing.service.ts:234`

Uses `` sql`${column} DESC` `` when the built-in `desc()` helper is already used elsewhere.

---

## Superforms

### FORMS-2. Direct `form.message` Assignment Instead of `setMessage()` (HIGH)

**File:** `src/lib/components/EditOrCreateMapPopover/Form.svelte:53-55`

Bypasses Superforms' internal reactivity mechanism. Other forms already use `setMessage()` correctly.

---

### FORMS-1. No Global `App.Superforms.Message` Type (MEDIUM)

**File:** `src/app.d.ts`

Each form uses a different message shape with unsafe `as` casts. Superforms supports declaring a global type.

---

### FORMS-3. Missing `onError` Handler on All Superforms Instances (MEDIUM)

**Files:** All 7 `superForm()` call sites

Without `onError`, unexpected server errors throw unhandled in the browser.

---

### FORMS-4. Login Page OTP/Magic-Link Actions Bypass Superforms (MEDIUM)

**File:** `src/routes/(app)/auth/login/+page.server.ts:74-165`

The requestOTP, verifyOTP, and resendConfirmation actions use raw `formData()` while the password login on the same page uses Superforms.

---

### FORMS-7. Inconsistent Error Display Across Forms (MEDIUM)

7 forms display errors in 5 different ways (AuthAlert, inline div, Alert.Root, typed message parsing, raw string).

---

## Mapbox GL JS / MapLibre

### MAPBOX-1. DOM-Based Markers Instead of GPU-Rendered Layers (HIGH)

**File:** `src/lib/components/map/MapView.svelte:272-321`

Every stop creates a real HTML DOM element via `<Marker>`. With 50+ stops, this causes frame drops during pan/zoom and high memory usage. Should use a GeoJSON source with `SymbolLayer`/`CircleLayer`.

---

### MAPBOX-3. Style URL Change Causes Full Map Reload (MEDIUM)

**File:** `src/lib/components/map/MapView.svelte:59-63`

Dark/light theme toggle changes the style URL, triggering `map.setStyle()` which removes all sources/layers and reloads tiles. Route lines and markers disappear momentarily.

---

### MAPBOX-4. No Clustering for Stop Markers (MEDIUM)

**File:** `src/lib/components/map/MapView.svelte:272-321`

All stops rendered as individual markers regardless of zoom level or density. MapLibre GeoJSON sources natively support clustering.

---

### MAPBOX-6. Separate GeoJSON Source Per Route Line (MEDIUM)

**File:** `src/lib/components/map/MapView.svelte:249-268`

Each route creates a separate source and layer. Should be one FeatureCollection with data-driven `'line-color': ['get', 'color']`.

---

## Tailwind CSS / shadcn-svelte

### TAILWIND-4. `hsl()` Wrapper on Non-HSL CSS Variables (HIGH)

**File:** `src/lib/components/ui/file-upload/file-upload.svelte:337-340`

`border-color: hsl(var(--primary))` — the project uses Tailwind v4 where CSS variables are raw color values, not HSL channels. This produces invalid CSS. Tailwind v3→v4 migration leftover.

---

### TAILWIND-15. Button Class Overrides Defeat Variant System (HIGH)

**Files:** `HeroSection.svelte:99`, `CTASection.svelte:82`, `PricingSection.svelte:171-174`

Landing page buttons override 8+ properties (height, gap, radius, bg, padding, font, tracking, text color, hover color). Should be a custom Button variant.

---

### TAILWIND-1. Duplicated Inline Animation Pattern in 10+ Components (MEDIUM)

**Files:** `HeroSection.svelte`, `CTASection.svelte`, `PricingSection.svelte`, `MetricsSection.svelte`, + 6 more

Identical `style="opacity: 0; transform: translateY(20px)"` + JS `$effect` pattern repeated in every marketing section. Should be a shared Svelte action.

---

### TAILWIND-10. `mr-2` on Icons Inside Buttons That Already Have `gap-2` (MEDIUM)

**Files:** 10+ locations across admin pages, route pages, and popovers

Creates double spacing (16px total instead of 8px between icon and text).

---

### TAILWIND-12/13. Hand-Built Segmented Controls Instead of Tabs Component (MEDIUM)

**Files:** `OptimizationFooter.svelte:271-304`, `PricingSection.svelte:109-135`

Two separate reimplementations of segmented controls lacking keyboard nav and aria-selected. The Tabs component is already available and used elsewhere.

---

## Zod

### ZOD-3. Stop Field Definitions Triplicated (MEDIUM)

**Files:** `schemas/stop.ts:8-17,26-39`, `schemas/map.ts:7-20`

Three nearly-identical stop field schemas with divergent phone validation (`phoneSchema` vs `z.string().max(32)`).

---

### ZOD-6. `z.string()` for UUID Fields in Auth Schemas (MEDIUM)

**File:** `src/lib/schemas/auth.ts:46-72`

`invitationSchema` and `loginTokenSchema` use `z.string()` for ID fields while every other entity schema uses `z.uuid()`.

---

### ZOD-14. Entity Schemas Fully Duplicate Drizzle Column Definitions (MEDIUM)

**Files:** All entity schemas in `src/lib/schemas/` vs `src/lib/server/db/schema.ts`

Every entity schema manually redeclares the same fields as the Drizzle table. The `drizzle-zod` package (which provides `createSelectSchema`) is not used.

---

### ZOD-17. `emailSchema` Not Used in Admin Account Creation (LOW)

**File:** `src/routes/api/admin/accounts/+server.ts:9`

Uses `z.string().email()` instead of the shared `emailSchema`. Admin can create accounts with emails that users can't log in with.

---

## AWS Lambda / TSP Solver

### LAMBDA-5. Webhook Failure Silently Deletes SQS Message (CRITICAL)

**File:** `tsp_solver/main.py:338-342`

`try_send_webhook()` catches ALL exceptions and returns success to SQS. The optimization result is permanently lost. Combined with no DLQ (LAMBDA-16), there is no recovery path.

**Fix:** Re-raise the exception so Lambda returns failure to SQS, which will retry via visibility timeout.

---

### LAMBDA-6. No Webhook Retry with Backoff (HIGH)

**File:** `tsp_solver/main.py:311-335`

Single HTTP POST with 10-second timeout. No retry on transient failures.

**Fix:** Retry up to 3 times with exponential backoff (1s, 2s, 4s).

---

### LAMBDA-16. No Infrastructure-as-Code or Dead Letter Queue (HIGH)

No SAM/CloudFormation/CDK template exists. The SQS queue configuration (DLQ, maxReceiveCount) is managed manually or not at all. Poison messages retry indefinitely.

**Fix:** Create IaC defining the Lambda, SQS queue, and DLQ with maxReceiveCount=3.

---

### LAMBDA-2. Unpinned Dependencies in Docker Build (HIGH)

**File:** `tsp_solver/Dockerfile:7`

`uv.lock` exists but is excluded from Docker via `.dockerignore`. Builds use unpinned `>=` ranges from `pyproject.toml`.

**Fix:** Export pinned requirements from `uv.lock` and use them in the Docker build.

---

### LAMBDA-7. Handler Only Processes First SQS Record (MEDIUM)

**File:** `tsp_solver/main.py:356`

`record = event["Records"][0]` — if Lambda delivers a batch, records [1..N] are silently ignored.

**Fix:** Either configure BatchSize=1 or add `assert len(event["Records"]) == 1`.

---

### LAMBDA-8. No Structured JSON Logging (MEDIUM)

**File:** `tsp_solver/main.py:11-12`

Plain-text logs with f-string formatting. CloudWatch Insights cannot query structured fields.

---

### LAMBDA-14. `_NB_THREADS=4` May Exceed Lambda vCPU Allocation (MEDIUM)

**File:** `tsp_solver/main.py:112`

Hardcoded 4 threads but Lambda allocates CPU proportional to memory (1 vCPU at 1769 MB). Over-threading causes contention.

**Fix:** Set thread count based on memory/vCPU allocation, or use a conservative default of 2.

---

### LAMBDA-11. Environment Variables Replaced on Every Deploy (MEDIUM)

**File:** `tsp_solver/.github/workflows/deploy.yml:74-88`

`update-function-configuration --environment` runs on every deploy, replacing all env vars. Any manually added variable is silently removed.

---

### LAMBDA-13. ECR Cleanup Keeps Only Latest Image (LOW)

**File:** `tsp_solver/.github/workflows/deploy.yml:92-118`

All images except the newest are deleted. Rollback requires a full rebuild.

**Fix:** Keep at least 3-5 recent images.
