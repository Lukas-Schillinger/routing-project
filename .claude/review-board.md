# Review Task Board

> **Source:** `.claude/review.md` — read the matching section there for full context, file paths, and suggested fixes.

## Agent Protocol

1. **Claim:** Find the next `TODO` item. Change its status to `IN_PROGRESS`.
2. **Verify:** Read the referenced files. Confirm the problem actually exists. The review was written by AI agents and may contain:
   - False positives (problem doesn't exist or was already fixed)
   - Wrong severity (a "critical" that's actually low-impact)
   - Wrong fix (the suggested fix is worse than the current code)
   - Symptoms of a larger structural problem (fix the root cause, not the symptom)
3. **Decide:**
   - If invalid → mark `SKIP` with a reason in the Notes column
   - If it's a symptom of something bigger → note the root cause in Notes, fix that instead
   - If valid → implement the fix
4. **Implement:** Work in a git worktree for isolation. Follow CLAUDE.md conventions.
5. **Check:** Run `npm run check && npm run lint`. Run relevant tests if they exist.
6. **Complete:** Set status to `DONE`, fill in the Branch column.

**Status values:** `TODO` | `IN_PROGRESS` | `DONE` | `SKIP`

---

## Week 1 — Security & Correctness

| # | ID | Status | Title | Branch | Notes |
|---|-----|--------|-------|--------|-------|
| 1 | S1 | TODO | OTP Not Invalidated After Use (Replay Attack) | | |
| 2 | S2 | TODO | Token Type Not Validated — Password Reset Token Accepted as Login Token | | |
| 3 | S3 | TODO | Non-Timing-Safe Webhook Secret Comparison | | |
| 4 | S4 | TODO | Invitation Uses 6-Digit OTP with 30-Day Expiry (Brute-Forceable) | | |
| 5 | S5 | TODO | Rate Limiting Skips Auth Form Actions | | |
| 6 | S6 | TODO | Admin Impersonate/Stop Has No Auth Check | | |
| 7 | S7 | TODO | Admin Pages Rely Solely on Layout for Auth | | |
| 8 | D1 | TODO | SQL Injection via `sql.raw()` with String Interpolation | | |
| 9 | D2 | TODO | `delivery_index: 0` Silently Becomes `null` | | |
| 10 | D3 | TODO | Cross-Org Invitation Deletion in `deleteUser` | | |
| 11 | D4 | TODO | Non-Atomic Default Depot Swap (Race Condition) | | |
| 12 | D5 | TODO | Billing Idempotency Has No Unique Constraints (TOCTOU) | | |
| 13 | D6 | TODO | Concurrent Credit Check Race Condition | | |
| 14 | D7 | TODO | Route Recalculation Permanently Disabled | | |
| 15 | D8 | TODO | `redeemInvitation` Calls `createUser` Outside Transaction Scope | | |
| 16 | D9 | TODO | `getOrCreateDistanceMatrix` Has TOCTOU Race (No Unique Index) | | |
| 17 | D10 | TODO | Tenancy Not Enforced Atomically in Several Services | | |
| 18 | F1 | TODO | Svelte 4 `$app/stores` Import in 3 Components | | |
| 19 | F2 | TODO | `$derived(() => ...)` Should Be `$derived.by()` | | |
| 20 | F3 | TODO | Mutating `$derived` Via `bind:value` | | |
| 21 | F4 | TODO | `w-3xl` Is Not a Valid Tailwind Class | | |

## Week 2 — CI & Testing

| # | ID | Status | Title | Branch | Notes |
|---|-----|--------|-------|--------|-------|
| 22 | T1 | TODO | CI Does Not Run Tests | | |
| 23 | T2 | TODO | E2E Selector Typo — Test Is Broken | | |
| 24 | T3 | TODO | E2E Has No Database Cleanup Between Runs | | |
| 25 | T4 | TODO | `admin.service.ts` Has Zero Tests | | |
| 26 | T5 | TODO | TSP Solver Has Zero Tests | | |
| 27 | T6 | TODO | Login Page Test Tests Nothing Meaningful | | |
| 28 | T7 | TODO | `waitForTimeout` Flakiness in E2E | | |
| 29 | T8 | TODO | Webhook Signature Never Tested | | |

## Week 3 — Open Source Readiness

| # | ID | Status | Title | Branch | Notes |
|---|-----|--------|-------|--------|-------|
| 30 | O1 | TODO | No `.env.example` | | |
| 31 | O2 | TODO | README Inadequate for Portfolio | | |
| 32 | O3 | TODO | TSP Solver Missing Essentials | | |
| 33 | O4 | TODO | Render Service Missing Everything | | |
| 34 | O5 | TODO | No CONTRIBUTING.md or CODE_OF_CONDUCT.md | | |
| 35 | O6 | TODO | Package.json Metadata | | |
| 36 | O7 | TODO | Dead Code in TSP Solver | | |
| 37 | RS1 | TODO | Boilerplate README and Layout Metadata | | |
| 38 | RS2 | TODO | Non-Wend Email Templates Shipped | | |
| 39 | RS3 | TODO | Redundant Destructuring in Magic Invite | | |
| 40 | RS4 | TODO | Password Reset PreviewProps Includes Field Not in Schema | | |
| 41 | RS5 | TODO | wend-confirm-email.tsx Exports as `WendMagicLinkEmail` | | |

## Week 4 — Performance & Polish

| # | ID | Status | Title | Branch | Notes |
|---|-----|--------|-------|--------|-------|
| 42 | S8 | TODO | Health Endpoint Leaks Infrastructure Details Without Authentication | | |
| 43 | S9 | TODO | Password Minimum Strength Is Only 6 Characters | | |
| 44 | A1 | TODO | DB Accessed Directly in `/api/health` | | |
| 45 | A2 | TODO | `requirePermissionApi` Inside `try/catch` in Invitations Route | | |
| 46 | A3 | TODO | Duplicate `adjustCredits` Implementation | | |
| 47 | A4 | TODO | `getRequestEvent()` Antipattern in Route Handlers | | |
| 48 | A5 | TODO | Inconsistent Error Response Shape in 3 Routes | | |
| 49 | A6 | TODO | `ServiceError.validation()` Used for Not-Found Conditions | | |
| 50 | A7 | TODO | Demo Pages Have No Auth Checks | | |
| 51 | A8 | TODO | `includeStats` Param Accepted But Ignored; Response Envelope Mismatch | | |
| 52 | A9 | TODO | `end_at_depot` Default Contradicts Schema | | |
| 53 | A10 | TODO | Two Service Classes in One File | | |
| 54 | A11 | TODO | `logout` API Route Throws Without `handleApiError` | | |
| 55 | A12 | TODO | Plain `Error` Instead of `ServiceError` in Services | | |
| 56 | A13 | TODO | `access_token_hash` Exposed in Route Share API Responses | | |
| 57 | B1 | TODO | `cancel_at` From Stripe Portal Never Stored (Known Bug) | | |
| 58 | B2 | TODO | Free Users Can't Buy Credits (No Stripe Customer) | | |
| 59 | B3 | TODO | Admin Credit Balance Calculation Omits Plan Monthly Credits | | |
| 60 | B4 | TODO | `trialing` Status Gets Free-Tier Credits | | |
| 61 | P1 | TODO | `getBillingInfo` Called on Every Authenticated Request | | |
| 62 | P2 | TODO | `bulkCreateStops` = O(N*5) Queries | | |
| 63 | P3 | TODO | `upsertRoute` = 4 Sequential Queries Per Route | | |
| 64 | P4 | TODO | No Indexes on `optimization_jobs` Table | | |
| 65 | P5 | TODO | No Indexes on `matrices` Table | | |
| 66 | P6 | TODO | `geocode_raw` JSONB Returned in All Stop Queries | | |
| 67 | P7 | TODO | Missing `(map_id, driver_id)` Composite Index on Stops | | |
| 68 | P8 | TODO | Double `getBillingInfo` Call on Map Page | | |
| 69 | P9 | TODO | Sequential Queries That Should Be Parallel | | |
| 70 | P10 | TODO | `reorderStops` Sequential Updates Inside Transaction | | |
| 71 | P11 | TODO | O(N*M) Linear Searches in MapView Render Loop | | |
| 72 | P12 | TODO | Unbounded Queries | | |
| 73 | P13 | TODO | `stops.sort()` Mutates Prop In-Place | | |
| 74 | TS1 | TODO | `as Route` Casts Throughout route.service.ts | | |
| 75 | TS2 | TODO | `getJobById` Returns Raw Drizzle Row as Zod Type | | |
| 76 | TS3 | TODO | `as PublicUser` Casts in Permissions (LOW) | | |
| 77 | TS4 | TODO | `mapSchema` Missing `description` Field | | |
| 78 | TS5 | TODO | Missing `cancel_at` in Schema and Type | | |
| 79 | TS6 | TODO | Missing Return Type Annotations on Service Methods | | |
| 80 | DB1 | TODO | Duplicate Migration `0024_derived_credits.sql` | | |
| 81 | DB2 | TODO | `inputsHash` camelCase Inconsistency | | |
| 82 | DB4 | TODO | `organizations.created_by/updated_by` Lack FK References (HIGH) | | |
| 83 | DB5 | TODO | Missing Index on `token_hash` | | |
| 84 | DB6 | TODO | `mailRecordSchema` Missing `error` Field | | |
| 85 | FP1 | TODO | `window.location.href = '/maps'` Bypasses SvelteKit | | |
| 86 | FP2 | TODO | Hard-Coded URLs Without `resolve()` | | |
| 87 | FP3 | TODO | `alert()` in ColumnMappingStep | | |
| 88 | FP4 | TODO | `interface` Instead of `type` in 20+ Components | | |
| 89 | FP5 | TODO | Accessibility Issues | | |
| 90 | FP6 | TODO | Redundant `onDestroy` in OptimizationOverlay | | |
| 91 | FP7 | TODO | 1-Second Polling in RouteTimeline for Same-Tab localStorage | | |
| 92 | FP8 | TODO | Silent Polling Error Swallowing | | |
| 93 | FP9 | TODO | Two Icon Libraries | | |
| 94 | E1 | TODO | `console.error` Instead of Structured Logger in Auth Pages | | |
| 95 | E2 | TODO | R2 Service Leaks Internal AWS Errors | | |
| 96 | E3 | TODO | Webhook Secrets Optional But Required at Runtime | | |
| 97 | E4 | TODO | Raw Webhook Body Logged Before Validation | | |
| 98 | E5 | TODO | Client-Side Errors Not Sent to Sentry | | |
| 99 | E6 | TODO | Mail Webhook Handler Has No Structured Logging | | |
| 100 | TSP1 | TODO | Uses pyvroom Private API | | |
| 101 | TSP2 | TODO | `job_id=None` in Error Webhook Breaks Receiver | | |
| 102 | TSP3 | TODO | `start_at_depot` Parsed But Silently Ignored | | |
| 103 | TSP4 | TODO | `NaN`/`Infinity` Matrix Values Bypass Validation | | |
| 104 | TSP5 | TODO | Deploy Pushes Both Dev and Prod From Same Branch | | |
| 105 | TSP6 | TODO | Baseline Solve Runs Unnecessarily for `fairness="low"` | | |
| 106 | TSP7 | TODO | Editable Install in Lambda Container | | |

## Consistency Audit

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 107 | C1.1 | TODO | Raw `throw new Error()` vs `ServiceError` factory methods (HIGH) | | |
| 108 | C1.2 | TODO | Inconsistent `instanceof` checks in catch blocks (MEDIUM) | | |
| 109 | C1.3 | TODO | Three error display patterns on client (MEDIUM) | | |
| 110 | C1.4 | TODO | `console.error()` usage inconsistent in page server files (LOW) | | |
| 111 | C1.5 | TODO | Silent error swallowing (LOW) | | |
| 112 | C2.1 | TODO | Superforms vs manual state management (HIGH) | | |
| 113 | C2.2 | TODO | Two different field component systems (HIGH) | | |
| 114 | C2.3 | TODO | Client validator inconsistency (MEDIUM) | | |
| 115 | C2.4 | TODO | Form reset patterns (MEDIUM) | | |
| 116 | C2.5 | TODO | Inconsistent `novalidate` attribute (LOW) | | |
| 117 | C3.1 | TODO | Variable naming (MEDIUM) | | |
| 118 | C3.2 | TODO | Three different spinner icons (MEDIUM) | | |
| 119 | C3.3 | TODO | Admin forms missing spinners (LOW) | | |
| 120 | C4.1 | TODO | Response wrapping inconsistency (HIGH) | | |
| 121 | C4.2 | TODO | `return json({ error })` vs `throw ServiceError` (HIGH) | | |
| 122 | C4.3 | TODO | Webhook success response shape (LOW) | | |
| 123 | C4.4 | TODO | DELETE response shape (LOW) | | |
| 124 | C4.5 | TODO | Missing logging in CRUD routes (MEDIUM) | | |
| 125 | C4.6 | TODO | Parameter extraction timing (LOW) | | |
| 126 | C5.1 | TODO | Admin pages use raw `fetch()` instead of API service clients (HIGH) | | |
| 127 | C5.2 | TODO | Callback naming inconsistency (MEDIUM) | | |
| 128 | C6.1 | TODO | Missing `organization_id` on DELETE operations (CRITICAL) | | |
| 129 | C6.2 | TODO | Missing audit fields on inserts (MEDIUM) | | |
| 130 | C6.4 | TODO | Raw SQL in optimization service (LOW) | | |
| 131 | C6.5 | TODO | Inconsistent delete return types (LOW) | | |
| 132 | C7.1 | TODO | Responsive detection: IsMobile vs MediaQuery (LOW) | | |
| 133 | C7.2 | TODO | Snippet typing inconsistency (MEDIUM) | | |
| 134 | C7.3 | TODO | Empty state patterns (MEDIUM) | | |
| 135 | C7.4 | TODO | Dialog/Popover state management (LOW) | | |
| 136 | C8.1 | TODO | Success message format inconsistency (MEDIUM) | | |
| 137 | C8.2 | TODO | Error message format inconsistency (MEDIUM) | | |
| 138 | C8.3 | TODO | Dual error display in OptimizationFooter (LOW) | | |
| 139 | C8.4 | TODO | Missing success notifications (LOW) | | |
| 140 | C8.5 | TODO | No `toast.promise()` usage (LOW) | | |
| 141 | C9.1 | TODO | Error message styling inconsistency (MEDIUM) | | |
| 142 | C9.2 | TODO | Button height inconsistency (MEDIUM) | | |
| 143 | C9.3 | TODO | Border radius inconsistency (LOW) | | |
| 144 | C9.4 | TODO | Shadow inconsistency (LOW) | | |
| 145 | C9.5 | TODO | Dark mode coverage gaps (LOW) | | |
| 146 | C9.6 | TODO | Transition duration inconsistency (LOW) | | |
| 147 | C10.1 | TODO | `interface` used instead of `type` (MEDIUM) | | |
| 148 | C10.2 | TODO | `nullable().optional()` vs `.nullish()` inconsistency (MEDIUM) | | |
| 149 | C10.3 | TODO | Type naming: Response vs Result vs Data vs Payload (MEDIUM) | | |
| 150 | C10.4 | TODO | Component prop definition patterns (LOW) | | |
| 151 | C11.1 | TODO | Admin pages rely solely on layout-level check (MEDIUM) | | |
| 152 | C11.2 | TODO | Demo pages inconsistent permission levels (LOW) | | |
| 153 | C12.1 | TODO | Unused `routeShareApi` service (MEDIUM) | | |
| 154 | C12.2 | TODO | Response unwrapping inconsistency (MEDIUM) | | |
| 155 | C12.3 | TODO | Query parameter construction (LOW) | | |
| 156 | C12.4 | TODO | `billing.ts:cancelScheduledDowngrade()` returns void (LOW) | | |
| 157 | C13.1 | TODO | `routeSchema` name collision (HIGH) | | |
| 158 | C13.2 | TODO | Schemas scattered outside `src/lib/schemas/` (HIGH) | | |
| 159 | C13.3 | TODO | Shared schema not reused (MEDIUM) | | |
| 160 | C13.4 | TODO | `geoJsonLineStringSchema` duplication (MEDIUM) | | |
| 161 | C13.5 | TODO | Schema naming convention inconsistency (LOW) | | |
| 162 | C13.6 | TODO | `.parse()` vs `.safeParse()` in API routes (LOW) | | |
| 163 | C13.7 | TODO | Import paths with `.js` extension (LOW) | | |
| 164 | C14.1 | TODO | Parameter destructuring style (LOW — acceptable variation) | | |
| 165 | C14.3 | TODO | Error handling in load functions (MEDIUM) | | |
| 166 | C14.4 | TODO | Conditional billing data typing (LOW) | | |

## Best Practices Audit

> **Source:** `.claude/best-practices-audit.md` — 9 agents auditing library usage against official docs.

### Stripe

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 167 | STRIPE-1 | TODO | No `invoice.payment_failed` webhook handler (CRITICAL) | | |
| 168 | STRIPE-2 | TODO | No webhook event deduplication (HIGH) | | |
| 169 | STRIPE-4 | TODO | Lazy Stripe customer creation race condition (HIGH) | | |
| 170 | STRIPE-6 | TODO | Webhook returns non-2xx on processing failures (HIGH) | | |
| 171 | STRIPE-3 | TODO | Hardcoded `payment_method_types: ['card']` (MEDIUM) | | |
| 172 | STRIPE-5 | TODO | No idempotency keys on Stripe API mutations (MEDIUM) | | |
| 173 | STRIPE-7 | TODO | Success URL shows toast before webhook confirms payment (MEDIUM) | | |
| 174 | STRIPE-8 | TODO | `past_due` status immediately drops to free credits (MEDIUM) | | |
| 175 | STRIPE-9 | TODO | Admin deleteOrganization swallows Stripe errors (MEDIUM) | | |
| 176 | STRIPE-12 | TODO | syncSubscription trusts metadata org_id without cross-check (MEDIUM) | | |
| 177 | STRIPE-13 | TODO | No `invoice.paid` handler for subscription renewal (MEDIUM) | | |
| 178 | STRIPE-11 | TODO | No customer cleanup on abandoned checkout (LOW) | | |

### Auth & Security

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 179 | AUTH-1 | TODO | No RLS policies on any database table (HIGH) | | |
| 180 | AUTH-2 | TODO | No session invalidation on password change (HIGH) | | |
| 181 | AUTH-4 | TODO | Email not case-normalized (MEDIUM) | | |
| 182 | AUTH-5 | TODO | Session table lacks `user_id` index (MEDIUM) | | |
| 183 | AUTH-6 | TODO | 30-day sessions without step-up auth (MEDIUM) | | |
| 184 | AUTH-7 | TODO | Impersonation cookie not scoped to admin path (MEDIUM) | | |
| 185 | AUTH-9 | TODO | No expired session/token cleanup mechanism (LOW) | | |
| 186 | AUTH-10 | TODO | No authenticated password change flow (LOW) | | |

### SvelteKit & Svelte 5

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 187 | SVELTEKIT-6 | TODO | Excessive `invalidateAll()` — 40+ calls, all re-run all queries (HIGH) | | |
| 188 | SVELTEKIT-8 | TODO | `$effect` used to sync derived state to parent (MEDIUM) | | |
| 189 | SVELTEKIT-10 | TODO | Legacy Svelte 4 writable store for cross-page data (MEDIUM) | | |
| 190 | SVELTEKIT-11 | TODO | Manual polling instead of SSE/streaming (MEDIUM) | | |
| 191 | SVELTEKIT-12 | TODO | Redundant null check on guaranteed route params (LOW) | | |

### Drizzle ORM

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 192 | DRIZZLE-2 | TODO | Manual upsert race in route.service.ts (HIGH) | | |
| 193 | DRIZZLE-3 | TODO | Manual check-then-insert in addDriverToMap (MEDIUM) | | |
| 194 | DRIZZLE-4 | TODO | Inconsistent `$onUpdate` for updated_at columns (MEDIUM) | | |
| 195 | DRIZZLE-5 | TODO | Full-row fetch for existence checks (MEDIUM) | | |
| 196 | DRIZZLE-6 | TODO | Inconsistent org tenancy enforcement pattern (MEDIUM) | | |
| 197 | DRIZZLE-7 | TODO | `sql` template for DESC instead of `desc()` helper (LOW) | | |

### Superforms

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 198 | FORMS-2 | TODO | Direct `form.message` assignment instead of `setMessage()` (HIGH) | | |
| 199 | FORMS-1 | TODO | No global `App.Superforms.Message` type (MEDIUM) | | |
| 200 | FORMS-3 | TODO | Missing `onError` handler on all Superforms instances (MEDIUM) | | |
| 201 | FORMS-4 | TODO | Login OTP/magic-link actions bypass Superforms (MEDIUM) | | |
| 202 | FORMS-7 | TODO | Inconsistent error display across forms (MEDIUM) | | |

### Mapbox GL JS

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 203 | MAPBOX-1 | TODO | DOM-based markers instead of GPU-rendered layers (HIGH) | | |
| 204 | MAPBOX-3 | TODO | Style URL change causes full map reload (MEDIUM) | | |
| 205 | MAPBOX-4 | TODO | No clustering for stop markers (MEDIUM) | | |
| 206 | MAPBOX-6 | TODO | Separate GeoJSON source per route line (MEDIUM) | | |

### Zod

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 207 | ZOD-3 | TODO | Stop field definitions triplicated with divergent validation (MEDIUM) | | |
| 208 | ZOD-6 | TODO | `z.string()` for UUIDs in auth schemas (MEDIUM) | | |
| 209 | ZOD-14 | TODO | Entity schemas duplicate Drizzle definitions — no `drizzle-zod` (MEDIUM) | | |
| 210 | ZOD-17 | TODO | `emailSchema` not used in admin account creation (LOW) | | |

### Tailwind CSS / shadcn-svelte

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 211 | TAILWIND-4 | TODO | `hsl()` wrapper on non-HSL CSS variables — invalid CSS (HIGH) | | |
| 212 | TAILWIND-15 | TODO | Button class overrides defeat variant system (HIGH) | | |
| 213 | TAILWIND-1 | TODO | Duplicated inline animation pattern in 10+ components (MEDIUM) | | |
| 214 | TAILWIND-10 | TODO | `mr-2` double-spacing with `gap-2` in buttons (MEDIUM) | | |
| 215 | TAILWIND-12 | TODO | Hand-built segmented controls instead of Tabs (MEDIUM) | | |

### Lambda / TSP Solver

| # | ID | Status | Title | Branch | Notes |
|---|------|--------|-------|--------|-------|
| 216 | LAMBDA-5 | TODO | Webhook failure silently deletes SQS message (CRITICAL) | | |
| 217 | LAMBDA-6 | TODO | No webhook retry with backoff (HIGH) | | |
| 218 | LAMBDA-16 | TODO | No infrastructure-as-code or dead letter queue (HIGH) | | |
| 219 | LAMBDA-2 | TODO | Unpinned dependencies in Docker build (HIGH) | | |
| 220 | LAMBDA-7 | TODO | Handler only processes first SQS record (MEDIUM) | | |
| 221 | LAMBDA-8 | TODO | No structured JSON logging (MEDIUM) | | |
| 222 | LAMBDA-14 | TODO | `_NB_THREADS=4` may exceed Lambda vCPU allocation (MEDIUM) | | |
| 223 | LAMBDA-11 | TODO | Environment variables replaced on every deploy (MEDIUM) | | |
| 224 | LAMBDA-13 | TODO | ECR cleanup keeps only latest image (LOW) | | |
