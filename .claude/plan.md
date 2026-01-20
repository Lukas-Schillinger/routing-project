# Wend Application - Production & Open-Source Readiness

## Overview

Make Wend a production-ready, open-source exemplary SaaS codebase. Organized into 7 phases by priority.

**Total Estimated Effort**: ~45-60 hours

### Priority Legend

| Priority | Meaning                      | Timeline          |
| -------- | ---------------------------- | ----------------- |
| **P0**   | CRITICAL - Security/blocking | Immediate         |
| **P1**   | HIGH - Production readiness  | This week         |
| **P2**   | MEDIUM - Quality of life     | Near-term         |
| **P3**   | LOW - Nice to have           | When time permits |
| **P4**   | DEFER - Not needed yet       | Future            |

---

## Phase 1: Critical Security Fixes

**Priority**: IMMEDIATE
**Effort**: ~3-4 hours

### 1.1 Fix Session Cookie Security ✅ `P0` `30m`

- Add HttpOnly flag to prevent XSS token theft
- Add Secure flag for HTTPS-only in production
- Add SameSite=lax for CSRF protection
- **File**: `src/lib/services/server/auth.ts`

### 1.2 Fix Organization Service Bug `P0` `30m`

- Fix incorrect WHERE clause in getOrganization method
- Verify requester belongs to organization
- **File**: `src/lib/services/server/user.service.ts`

### 1.3 Implement Rate Limiting `P0` `2h`

- Create rate limiting middleware using `rate-limiter-flexible` or similar
- Apply to auth endpoints: login, OTP, password reset
- Apply to API endpoints with per-user limits
- **File**: `src/lib/server/rate-limit.ts`
- **File**: `src/hooks.server.ts`

---

## Phase 2: Open-Source Readiness

**Priority**: Week 1
**Effort**: ~3-4 hours

### 2.1 Create .env.example & LICENSE `P2` `1h`

- Create `.env.example` with all required environment variables
- Group by service (Database, Auth, Mapbox, Resend, AWS, R2)
- Add MIT LICENSE file

### 2.2 Rewrite README.md `P3` `1h`

- Project overview
- Features list & tech stack
- Quick start (clone, install, copy .env.example, run)
- Link to external service setup docs (Mapbox, Resend, AWS)
- Brief microservices overview (TSP solver, email renderer)

### 2.3 Add SECURITY.md `P3` `30m`

- Security contact email
- Vulnerability disclosure process (1-2 paragraphs)

**Deferred:**

- CONTRIBUTING.md (add when contributors appear)
- CODE_OF_CONDUCT.md (add when community forms)
- Setup scripts (manual setup is fine initially)

---

## Phase 3: Production Hardening

**Priority**: Week 2
**Effort**: ~12-16 hours

### 3.1 TSP Solver Performance `P2` `4-6h`

> **Problem**: Simple optimizations take 30+ seconds. Suspected cause: pip installs during Lambda cold start.

#### 3.1.1 Diagnose Cold Start `P2` `30m`

- Add timing logs to Lambda handler (import time, solver time, webhook time)
- Check CloudWatch for cold start duration breakdown
- Identify if issue is dependency loading vs solver computation

#### 3.1.2 Optimize Docker Image `P2` `2h`

- **File**: `tsp_solver/Dockerfile`
- Pre-install all dependencies in Docker layer (not at runtime)
- Use multi-stage build to reduce image size
- Pin exact versions in requirements to leverage Docker cache
- Consider using `uv` for faster installs in build

#### 3.1.3 Reduce Dependency Size `P2` `1h`

- Audit `ortools` - check if lighter alternatives exist
- Strip unnecessary files from packages
- Use Lambda-optimized base image (`public.ecr.aws/lambda/python:3.13`)

#### 3.1.4 Provisioned Concurrency (if needed) `P3` `1h`

- Enable provisioned concurrency to eliminate cold starts
- Start with 1-2 instances
- Monitor cost vs performance tradeoff

#### 3.1.5 Solver Algorithm Tuning `P3` `1h`

- Review OR-Tools parameters in `main.py`
- Reduce default time_limit if solution found early
- Add early termination when solution quality is "good enough"
- Consider simpler algorithm for small problems (<10 stops)

#### 3.1.6 Warm-up Strategy `P3` `30m`

- Add CloudWatch Events rule to ping Lambda every 5 minutes
- Keep at least one instance warm during business hours

---

### 3.2 Environment Validation `P1` `1h`

- Create startup validation for required environment variables
- Fail fast with clear error messages if missing
- Separate required vs optional variables
- **File**: `src/lib/server/env.ts`

### 3.3 Consolidate Configuration `P1` `1h`

- Create central config file for magic numbers
- Move hardcoded values: session duration, OTP expiry, file size limits, pagination defaults
- **File**: `src/lib/config.ts`

### 3.4 Create Health Check Endpoint `P1` `30m`

- Database connectivity check
- Return version info from package.json
- **Route**: `/api/health`

### 3.5 Structured Logging - Setup `P2` `1h`

- Create logger utility with log levels (debug, info, warn, error)
- JSON format for production, pretty format for dev
- **File**: `src/lib/server/logger.ts`

### 3.6 Structured Logging - Request Tracking `P2` `1h`

- Add request ID middleware to hooks
- Include request ID in all log entries
- **File**: `src/hooks.server.ts`

### 3.7 Structured Logging - Migration `P2` `1h`

- Replace console.log/error calls in services with structured logger
- Replace console calls in API routes

### 3.8 Error Tracking - Sentry Setup `P2` `1h`

- Install and configure Sentry SDK
- Configure for both client and server
- Set up environment-based DSN

### 3.9 Error Tracking - Source Maps `P2` `30m`

- Configure source maps upload in build pipeline
- Add to Vercel build or GitHub Actions

### 3.10 Audit Logging - Schema `P3` `30m`

- Create audit_logs table migration
- Fields: id, organization_id, user_id, action, resource_type, resource_id, metadata, ip_address, created_at

### 3.11 Audit Logging - Service `P3` `1h`

- Create audit service with log method
- **File**: `src/lib/services/server/audit.service.ts`

### 3.12 Audit Logging - Integration `P3` `1h`

- Add audit calls to auth events (login, logout, password change)
- Add audit calls to permission/membership changes
- Add audit calls to data exports

---

## Phase 4: Testing Infrastructure

**Priority**: Week 3-4
**Effort**: ~16-20 hours

> **Current State**: Vitest + Playwright already configured. Existing tests:
>
> - `e2e/auth.spec.ts` - Login/register flows
> - `src/lib/services/external/cloudflare/r2.spec.ts` - R2 integration
> - `src/lib/services/external/mapbox/geocoding.spec.ts` - Geocoding

---

### 4.1 Test Utilities & Fixtures `P2` `2h`

#### 4.1.1 Create Test Database Helper `P2` `1h`

- **File**: `src/lib/testing/db.ts`
- Setup/teardown test database connection
- Transaction wrapper for test isolation (rollback after each test)
- Seed helper functions

#### 4.1.2 Create Mock Factories `P2` `30m`

- **File**: `src/lib/testing/factories.ts`
- `createMockUser(overrides?)` - Generate test user data
- `createMockOrganization(overrides?)`
- `createMockDriver(overrides?)`
- `createMockMap(overrides?)`
- `createMockStop(overrides?)`
- `createMockRoute(overrides?)`

#### 4.1.3 Create Service Mocks `P2` `30m`

- **File**: `src/lib/testing/mocks.ts`
- Mock for `mailService` (capture sent emails)
- Mock for `geocodingService` (return predictable coordinates)
- Mock for `r2Service` (in-memory file storage)
- Mock for `sqsService` (capture queued messages)

---

### 4.2 Unit Tests: Core Services `P2` `4h`

#### 4.2.1 Auth & Token Services `P1` `2h`

- **File**: `src/lib/services/server/auth.test.ts`
  - Password hashing/verification
  - Session creation/validation
  - Session invalidation
- **File**: `src/lib/services/server/token.utils.test.ts`
  - Token generation (OTP, hex)
  - Token hashing
  - Expiry calculation
- **File**: `src/lib/services/server/login-token.service.test.ts`
  - Create login token
  - Validate token (valid, expired, wrong user)
  - Delete token after use

#### 4.2.2 User & Organization Services `P2` `1h`

- **File**: `src/lib/services/server/user.service.test.ts`
  - Create user
  - Update user
  - Get user by email
  - Delete user (cascade behavior)
- **File**: `src/lib/services/server/invitation.service.test.ts`
  - Create invitation
  - Redeem invitation (creates user + membership)
  - Expired invitation rejection
  - Duplicate email handling

#### 4.2.3 Driver Service `P3` `1h`

- **File**: `src/lib/services/server/driver.service.test.ts`
  - CRUD operations
  - Tenancy isolation (org A can't see org B's drivers)
  - Color generation/validation

---

### 4.3 Unit Tests: Map & Route Services `P3` `3h`

#### 4.3.1 Map Service `P3` `1h`

- **File**: `src/lib/services/server/map.service.test.ts`
  - Create/update/delete map
  - Duplicate map
  - Get maps with filters

#### 4.3.2 Stop & Location Services `P3` `1h`

- **File**: `src/lib/services/server/stop.service.test.ts`
  - Add/update/remove stops
  - Bulk import stops
  - Stop reordering
- **File**: `src/lib/services/server/location.service.test.ts`
  - Location creation
  - Geocoding integration points

#### 4.3.3 Route & Optimization Services `P3` `1h`

- **File**: `src/lib/services/server/route.service.test.ts`
  - Route CRUD
  - Assign stops to routes
- **File**: `src/lib/services/server/optimization.service.test.ts`
  - Queue optimization request
  - Handle webhook response
  - Status transitions

---

### 4.4 Unit Tests: Permissions & Errors `P3` `1h`

#### 4.4.1 Permission System `P3` `30m`

- **File**: `src/lib/services/server/permissions.test.ts`
  - Role hierarchy validation
  - Permission checks for each role (admin, member, driver)
  - Cross-organization access denial

#### 4.4.2 Error Handling `P3` `30m`

- **File**: `src/lib/services/server/errors.test.ts`
  - ServiceError factory methods
  - Error code mapping
  - Error serialization

---

### 4.5 Integration Tests `P3` `4h`

#### 4.5.1 Multi-Tenancy Isolation `P2` `2h`

- **File**: `src/lib/services/server/tenancy.integration.test.ts`
- Create 2 orgs with identical data
- Verify complete isolation:
  - Org A cannot query Org B's drivers
  - Org A cannot access Org B's maps
  - Org A cannot see Org B's routes
  - Shared email cannot be invited to both orgs simultaneously

#### 4.5.2 Cascading Operations `P3` `1h`

- **File**: `src/lib/services/server/cascade.integration.test.ts`
- Delete map → verify stops, routes, locations cleaned up
- Delete driver → verify routes reassigned/orphaned correctly
- Delete organization → verify all data removed

#### 4.5.3 Route Share Flow `P3` `1h`

- **File**: `src/lib/services/server/route-share.integration.test.ts`
- Create share → generate token → validate access
- Revoke share → verify token invalid
- Expired share rejection

---

### 4.6 E2E Tests: Core Workflows `P3` `4h`

> Auth flows already covered in `e2e/auth.spec.ts`

#### 4.6.1 Map Creation Workflow `P3` `1h`

- **File**: `e2e/maps.spec.ts`
- Create new map
- Add driver
- Add stops (manual entry)
- Verify map displays correctly

#### 4.6.2 CSV Import Workflow `P3` `1h`

- **File**: `e2e/import.spec.ts`
- Upload CSV file
- Map columns
- Verify stops created
- Handle validation errors

#### 4.6.3 Route Management `P3` `1h`

- **File**: `e2e/routes.spec.ts`
- View optimized routes
- Share route via email
- Access shared route as external user

#### 4.6.4 Account Management `P3` `1h`

- **File**: `e2e/account.spec.ts`
- Update profile
- Change password
- Invite team member
- Manage organization settings (admin only)

---

### 4.7 CI/CD Pipeline `P1` `2h`

#### 4.7.1 GitHub Actions: PR Checks `P1` `1h`

- **File**: `.github/workflows/ci.yml`

```yaml
- Type check (svelte-check)
- Lint (eslint + prettier)
- Unit tests (vitest)
- Build verification
```

#### 4.7.2 GitHub Actions: E2E Tests `P2` `30m`

- **File**: `.github/workflows/e2e.yml`
- Run on main branch merges only (expensive)
- Playwright with headless browser
- Artifact upload on failure (screenshots, traces)

#### 4.7.3 Coverage Reporting `P3` `30m`

- Configure Vitest coverage (`@vitest/coverage-v8`)
- Add coverage badge to README
- Set minimum threshold (70% services)

---

## Phase 5: Billing & Subscriptions

**Priority**: Active
**Effort**: ~24-32 hours
**Linear Project**: [Phase 5: Billing & Subscriptions](https://linear.app/schillinger-tools/project/phase-5-billing-and-subscriptions-3974e20e9f0a)

---

### Business Model

**Hybrid subscription + credits:**

- Monthly subscription provides included credits (reset each period)
- Users can purchase additional credits at flat rate (roll over indefinitely)
- No surprise overage billing—users must explicitly purchase more credits
- Negative balance allowed on single optimization, then blocked until credits added

### Plans

| Plan | Price  | Monthly Credits | Features                     |
| ---- | ------ | --------------- | ---------------------------- |
| Free | $0/mo  | 200             | Route planning, optimization |
| Pro  | $49/mo | 2,000           | All Free + fleet_management  |

**Credit purchases:** $0.01/credit, $1 minimum (100 credits)

### Credit System

**Billable unit:** Stops optimized (counted after successful optimization)

**Balance calculation:** Transaction-based with expiration

```
available = SUM(amount) WHERE expires_at IS NULL OR expires_at > NOW()
```

**Transaction types:**

- `subscription_grant` — Monthly credits, expires at period end
- `purchase` — Bought credits, never expires
- `usage` — Deducted after successful optimization
- `expiration` — System-generated when subscription credits lapse
- `adjustment` — Future: manual admin corrections

**Consumption order:** Subscription credits first (they expire), then purchased credits

### Feature Gating

```typescript
type PlanFeatures = {
	fleet_management: boolean;
};
```

**`fleet_management` unlocks:**

- Driver route sharing (v0 gate point)
- Driver tracking (future)
- Delivery verification (future)
- Driver app access (future)

**Gate point:** When user attempts to share/send route to driver
**Downgrade behavior:** Keep existing shares, prevent new ones

---

### 5.1 Database Schema `P2` `5h`

#### 5.1.1 Create Plans Table `P2` `1h`

- **Migration**: `drizzle/XXXX_plans.sql`
- **File**: `src/lib/server/db/schema.ts`
- Fields: id (text pk), name, stripe_price_id (NOT NULL - all plans have Stripe prices), monthly_credits, features (jsonb)
- Seed Free ($0/mo) and Pro ($49/mo) plans
- Type the features JSONB: `{ fleet_management: boolean }`

#### 5.1.2 Create Subscriptions Table `P2` `1h`

- **Migration**: `drizzle/XXXX_subscriptions.sql`
- Fields: id, organization_id (unique fk), plan_id (fk), stripe_subscription_id (NOT NULL), stripe_customer_id (NOT NULL), status, current_period_start, current_period_end, created_at, updated_at
- Status: active, canceled, past_due, etc.
- Every org has a real Stripe subscription (Free tier is $0/month subscription)

#### 5.1.3 Create Credit Transactions Table `P2` `2h`

- **Migration**: `drizzle/XXXX_credit_transactions.sql`
- Fields: id, organization_id, type (enum), amount (int), expires_at (nullable timestamp), stripe_payment_intent_id (nullable), optimization_job_id (nullable), description, created_at
- Type enum: subscription_grant, purchase, usage, expiration, adjustment, refund
- Indexes: organization_id, (organization_id + created_at), optimization_job_id for idempotency

#### 5.1.4 Create Stripe Customer + Subscription on Org Creation `P2` `1h`

- **File**: `src/lib/services/server/user.service.ts` (in org creation flow)
- After creating organization record:
  1. Create Stripe customer with org metadata
  2. Create $0/month Free plan subscription
  3. Create local subscription record with Stripe IDs
- **Error handling**: If Stripe fails, roll back org creation (fail signup)
- This ensures unified billing flow — all orgs have real Stripe subscriptions

```typescript
// Pseudocode for org creation
const stripeCustomer = await stripe.customers.create({
  email: user.email,
  name: organization.name,
  metadata: { organization_id: organization.id }
});

const stripeSubscription = await stripe.subscriptions.create({
  customer: stripeCustomer.id,
  items: [{ price: FREE_PLAN_PRICE_ID }],
});

await db.insert(subscriptions).values({
  organization_id: organization.id,
  plan_id: 'free',
  stripe_customer_id: stripeCustomer.id,
  stripe_subscription_id: stripeSubscription.id,
  status: 'active',
  current_period_start: new Date(stripeSubscription.current_period_start * 1000),
  current_period_end: new Date(stripeSubscription.current_period_end * 1000),
});
```

---

### 5.2 Credit System Core `P2` `6h`

#### 5.2.1 Create Billing Service `P2` `2h`

- **File**: `src/lib/services/server/billing.service.ts`
- `getAvailableCredits(orgId)` — Calculate balance from transactions with expiration check
- `hasCredits(orgId, requiredAmount)` — Check if sufficient credits
- `grantSubscriptionCredits(orgId, amount, expiresAt)` — Called on subscription renewal
- `grantPurchasedCredits(orgId, amount, stripePaymentIntentId)` — Called on credit purchase
- `recordUsage(orgId, amount, optimizationJobId)` — Called after successful optimization
- Idempotency: Check optimization_job_id doesn't already exist before recording

#### 5.2.2 Record Usage in Optimization Webhook `P2` `2h`

- **File**: `src/lib/services/server/optimization.service.ts`
- After successful optimization in `completeOptimization`:
  - Count stops: `result.routes.flatMap(r => r.legs).length`
  - Call `billingService.recordUsage(organizationId, stopCount, jobId)`
- Ensure idempotency via job status check + optimization_job_id unique constraint

#### 5.2.3 Implement Pre-Optimization Credit Check `P2` `2h`

- **File**: `src/lib/services/server/optimization.service.ts`
- Before queueing optimization in `queueOptimization`:
  - Check `billingService.hasCredits(orgId, estimatedStops)`
  - Allow negative balance on single optimization (soft limit)
  - Block if already negative: throw `ServiceError.forbidden('Insufficient credits')`
- **File**: `src/routes/api/maps/[mapId]/optimize/+server.ts`
  - Handle forbidden error, return appropriate status for UI

---

### 5.3 Stripe Integration `P2` `8h`

#### 5.3.1 Configure Stripe Environment `P2` `2h`

- Install `stripe` package
- **File**: `src/lib/services/external/stripe/client.ts`
- Environment variables: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- Create Stripe products/prices in Dashboard:
  - **Free subscription: $0/month recurring** (required for unified billing)
  - Pro subscription: $49/month recurring
  - Credit unit: for one-time purchases with dynamic quantity
- **File**: `src/lib/config/billing.ts` — Store price IDs (FREE_PLAN_PRICE_ID, PRO_PLAN_PRICE_ID), per-credit rate ($0.01), minimum purchase (100)

#### 5.3.2 Implement Subscription Upgrade Flow `P2` `2h`

- **Route**: `POST /api/billing/checkout/subscription`
- **Key insight**: Customer already exists (created at signup), this is a plan change
- Use Stripe Checkout to collect payment method and upgrade existing subscription
- Redirect URLs: success → `/app/auth/billing?upgrade=success`, cancel → `/app/auth/billing`
- **File**: `src/lib/services/server/subscription.service.ts`
  - `createUpgradeCheckoutSession(orgId)` — Returns Stripe Checkout URL for upgrading to Pro
  - Checkout session uses existing customer ID from subscription record

#### 5.3.3 Implement Credit Purchase Flow `P2` `2h`

- **Route**: `POST /api/billing/checkout/credits`
- Request body: `{ amount: number }` (credit count, min 100)
- Calculate price: `amount * 0.01` (in dollars)
- Create Stripe Checkout Session (mode: 'payment') with line item
- Redirect URLs: success → `/app/auth/billing?purchase=success`, cancel → `/app/auth/billing`
- **File**: `src/lib/services/server/billing.service.ts`
  - `createCreditPurchaseSession(orgId, creditAmount)` — Returns Stripe Checkout URL

#### 5.3.4 Create Stripe Webhook Handler `P2` `2h`

- **Route**: `POST /api/webhooks/stripe`
- Verify Stripe signature using STRIPE_WEBHOOK_SECRET
- **Unified handling**: Same logic for Free ($0) and Paid tiers — no special casing
- Handle events:
  - `checkout.session.completed` — Check metadata for type (upgrade vs credits)
    - Upgrade: Subscription already updated by Stripe, sync local record
    - Credits: Grant purchased credits via `grantPurchasedCredits`
  - `invoice.paid` — Grant monthly credits (works for $0 and $49 invoices identically)
    - Look up plan by subscription, grant plan's `monthly_credits` with `expires_at = period_end`
  - `invoice.payment_failed` — Update subscription status to past_due, start grace period
  - `customer.subscription.updated` — Sync plan changes (upgrade/downgrade), period dates
  - `customer.subscription.deleted` — Only fires on account deletion (not downgrades)
- Idempotency: Use stripe_payment_intent_id for credit purchases, check event processed

---

### 5.4 Billing UI `P2` `8h`

#### 5.4.1 Create Billing Page `P2` `3h`

- **Route**: `/app/auth/billing/+page.svelte`
- **Server**: `/app/auth/billing/+page.server.ts` — Load subscription, plan, credit balance, usage history
- Display sections:
  - Current plan card (name, price, renewal date)
  - Credit balance (used / included this period + purchased balance)
  - Usage history table (current period + last 3 months toggle)
    - Per-optimization detail: date, map name, stops, credits used
    - Basic sorting by date, stops
  - Payment method (from Stripe, link to Customer Portal)
  - Actions: Upgrade plan, Buy credits, Manage subscription (Stripe Portal)

#### 5.4.2 Implement Header Credit Badge `P2` `2h`

- **Component**: `src/lib/components/billing/CreditBadge.svelte`
- Circular progress indicator showing credit usage percentage
- Color transitions: green (<80%) → yellow (80-99%) → red (100%+)
- Click opens popover with:
  - Current plan name
  - Credits: X / Y remaining
  - "Buy Credits" button
  - "View Billing" link
- **Integration**: Add to app header/navbar, visible to non-driver users
- **Data**: Load credit info in root `+layout.server.ts`, pass via page data

#### 5.4.3 Create Out-of-Credits Modal `P2` `2h`

- **Component**: `src/lib/components/billing/OutOfCreditsModal.svelte`
- Triggered when optimization blocked due to insufficient credits
- Content:
  - Message: "You've used all your credits this month"
  - Current balance display
  - Two CTAs: "Buy Credits" | "Upgrade Plan"
- "Buy Credits" → Opens credit purchase modal
- "Upgrade Plan" → Redirects to plan comparison / Stripe Checkout
- **Integration**: Trigger from optimize button error handling

#### 5.4.4 Create Credit Purchase Modal `P2` `1h`

- **Component**: `src/lib/components/billing/CreditPurchaseModal.svelte`
- Input: Credit amount (number input, min 100)
- Display: Calculated price ($X.XX)
- Submit: Calls `/api/billing/checkout/credits`, redirects to Stripe Checkout
- Error handling: Show validation errors, retry option

---

### 5.5 Feature Gating `P2` `3h`

#### 5.5.1 Add Features to Locals `P2` `2h`

- **File**: `src/lib/types/features.ts`
  - Define `PlanFeatures` type: `{ fleet_management: boolean }`
  - Define `hasFeature(features: PlanFeatures, feature: keyof PlanFeatures)` utility
- **File**: `src/hooks.server.ts`
  - After loading user, load their org's subscription and plan
  - Add `features: PlanFeatures` to `locals` alongside permissions
- **File**: `src/routes/+layout.server.ts`
  - Pass features to client via page data (like permissions)
- **File**: `src/lib/utils.ts`
  - Add `checkFeature(feature: keyof PlanFeatures)` client-side utility

#### 5.5.2 Gate Driver Route Sharing `P2` `1h`

- Identify route sharing UI touchpoints
- Add feature check before showing share UI/buttons
- When feature blocked:
  - Show upgrade prompt instead of share functionality
  - "Upgrade to Pro to share routes with drivers"
- **Files**: Relevant route sharing components and API routes

---

### 5.6 Polish & Testing (v1) `P3` `4h`

#### 5.6.1 Stripe Dunning & Payment Failure Handling `P3` `2h`

- Grace period logic: 7 days after payment failure
- During grace: Show warning banner, allow continued use
- After grace: Block new optimizations, keep data accessible
- Email notifications via Resend: Payment failed, grace period ending

#### 5.6.2 Subscription Downgrade Flow `P3` `1h`

- **Key insight**: "Cancellation" = downgrade to Free plan (not delete subscription)
- Schedule plan change to Free at period end via `stripe.subscriptions.update`
- Show "Pro features active until X, then switching to Free" message
- Keep Pro features until period ends
- Reactivation option: upgrade back to Pro before period ends
- User keeps Stripe customer + subscription (just changes plan)

```typescript
// Downgrade implementation
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: subscriptionItemId, price: FREE_PLAN_PRICE_ID }],
  proration_behavior: 'none', // No refund, change at period end
});
```

#### 5.6.3 Billing Service Tests `P3` `1h`

- **File**: `src/lib/services/server/billing.service.test.ts`
- Test credit calculation with mixed transaction types
- Test expiration logic
- Test idempotency (duplicate optimization_job_id)
- Test negative balance blocking

---

### Implementation Phases Summary

**v0 (MVP):** 5.1, 5.2, 5.3, 5.4, 5.5 — ~30h

- Schema + migrations
- Stripe customer/subscription creation on signup (unified billing)
- Credit system core
- Stripe Checkout integration (upgrade + credit purchases)
- Billing UI (page, badge, modals)
- Feature gating for fleet_management

**v1 (Polish):** 5.6 — ~4h

- Dunning and payment failure handling
- Cancellation flow
- Tests

**v2 (Scale):** Future

- Additional plans (Team, Enterprise custom)
- Stripe Elements for embedded checkout
- Admin credit adjustment interface
- Usage analytics dashboard

---

## Phase 6: Staff/Support Accounts `P4`

**Priority**: Low (DEFERRED)
**Effort**: ~4-6 hours

> MVP: Staff role + impersonation. Dashboard can be deferred—use Stripe Dashboard for billing, query DB for audit logs.

### 6.1 Staff Role & Permissions `P4` `2h`

- Add "staff" role to permission system
- Permissions: read_any_org, impersonate, view_audit_logs
- **File**: `src/lib/services/server/permissions.ts`

### 6.2 Impersonation `P4` `4h`

- Staff can "view as" any organization
- Visual indicator when impersonating (banner)
- Exit button to return to staff view
- All actions logged to audit trail
- **Route**: `POST /api/staff/impersonate`
- **File**: `src/lib/services/server/impersonation.service.ts`

**Deferred:**

- Staff dashboard UI (use existing admin tools + DB queries)
- 2FA requirement (add when staff team grows)
- IP whitelist (add if security incident occurs)

---

## Phase 7: Code Quality & Polish

**Priority**: Ongoing
**Effort**: ~6-8 hours

### 7.1 Accessibility Improvements `P3` `2h`

- Add skip-to-content link
- Add ARIA landmarks
- Ensure keyboard accessibility

### 7.2 Type Safety Improvements `P3` `2h`

- Fix User.organization_id optionality
- Add proper GeoJSON types
- Replace `unknown` with proper Mapbox types

### 7.3 Remove Dev-Only Code Risks `P2` `30m`

- Secure or remove dev-mode token returns in password reset

### 7.4 Branding & Social Assets `P3` `2h`

- **Favicon**: favicon.ico, favicon.svg, favicon-16x16.png, favicon-32x32.png
- **Apple Touch Icon**: apple-touch-icon.png (180x180)
- **Open Graph images**: og-image.png (1200x630) for link previews
- **Twitter Card**: twitter-image.png (summary_large_image)
- **Web App Manifest**: site.webmanifest (app name, icons, theme color)
- **Meta tags in app.html**: og:title, og:description, og:image, twitter:card
- **Theme color**: meta theme-color for browser chrome

### 7.5 SEO & Discoverability `P3` `2h`

- robots.txt (allow all, link to sitemap)
- sitemap.xml (or dynamic generation)
- Canonical URLs
- Structured data (JSON-LD for SaaS/WebApplication)

### 7.6 API Documentation `P4` `4h`

- Add OpenAPI/Swagger spec
- Document all endpoints
- Add request/response examples
