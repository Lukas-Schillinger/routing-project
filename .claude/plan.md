# Wend Application - Production & Open-Source Readiness

## Overview

Make Wend a production-ready, open-source exemplary SaaS codebase. Organized into 7 phases by priority.

**Total Estimated Effort**: ~45-60 hours

### Priority Legend

| Priority | Meaning | Timeline |
|----------|---------|----------|
| **P0** | CRITICAL - Security/blocking | Immediate |
| **P1** | HIGH - Production readiness | This week |
| **P2** | MEDIUM - Quality of life | Near-term |
| **P3** | LOW - Nice to have | When time permits |
| **P4** | DEFER - Not needed yet | Future |

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

## Phase 5: Billing & Subscriptions `P4`

**Priority**: Week 5-6 (DEFERRED)
**Effort**: ~16-20 hours

> **Recommendation**: Stripe for flexibility and ecosystem. LemonSqueezy if tax/compliance simplicity is priority.

---

### 5.1 Database Schema `P4` `2h`

#### 5.1.1 Subscriptions Table `P4` `1h`

- **Migration**: `drizzle/XXXX_subscriptions.sql`
- Fields: id, organization_id, stripe_customer_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
- Status enum: trialing, active, past_due, canceled, unpaid

#### 5.1.2 Usage Records Table `P4` `30m`

- **Migration**: `drizzle/XXXX_usage_records.sql`
- Fields: id, organization_id, metric (optimizations, stops_imported, api_calls), quantity, period_start, period_end, created_at
- Index on (organization_id, metric, period_start)

#### 5.1.3 Update Schema Types `P4` `30m`

- **File**: `src/lib/server/db/schema.ts`
- Add Drizzle table definitions
- Export types for Subscription, UsageRecord

---

### 5.2 Plan Configuration `P4` `1h`

#### 5.2.1 Define Plan Tiers `P4` `30m`

- **File**: `src/lib/config/plans.ts`
- Free tier:
  - 25 stops per map
  - 5 maps per month
  - 2 drivers
  - Basic optimization
- Pro tier ($X/mo):
  - 500 stops per map
  - Unlimited maps
  - 50 drivers
  - Advanced routing, route sharing
- Enterprise (custom):
  - Unlimited everything
  - API access, SSO, audit logs

#### 5.2.2 Feature Flags `P4` `30m`

- **File**: `src/lib/config/features.ts`
- Map plan tiers to feature access
- `canUseFeature(planId, feature)` helper

---

### 5.3 Stripe Integration `P4` `3h`

#### 5.3.1 Install & Configure Stripe `P4` `1h`

- Add `stripe` package
- Environment variables: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- **File**: `src/lib/services/external/stripe/client.ts`

#### 5.3.2 Create Stripe Products `P4` `1h`

- Create products/prices in Stripe Dashboard (or via API)
- Store price IDs in plan config
- Map Stripe price_id → internal plan_id

#### 5.3.3 Customer Management `P4` `1h`

- **File**: `src/lib/services/server/billing.service.ts`
- `createCustomer(organizationId, email)` - Create Stripe customer
- `getCustomer(organizationId)` - Retrieve customer
- Link Stripe customer_id to organization

---

### 5.4 Subscription Service `P4` `3h`

#### 5.4.1 Subscription CRUD `P4` `1h`

- **File**: `src/lib/services/server/subscription.service.ts`
- `createSubscription(orgId, priceId)` - Start subscription
- `getSubscription(orgId)` - Get current subscription
- `cancelSubscription(orgId)` - Cancel at period end
- `reactivateSubscription(orgId)` - Undo cancellation

#### 5.4.2 Checkout Flow `P4` `1h`

- **Route**: `POST /api/billing/checkout`
- Create Stripe Checkout Session
- Redirect to Stripe-hosted checkout
- Return URL: `/billing/success`

#### 5.4.3 Customer Portal `P4` `1h`

- **Route**: `POST /api/billing/portal`
- Create Stripe Customer Portal session
- Allow users to manage payment methods, view invoices

---

### 5.5 Webhook Handling `P4` `2h`

#### 5.5.1 Webhook Endpoint `P4` `1h`

- **Route**: `POST /api/webhooks/stripe`
- Verify Stripe signature
- Parse event type

#### 5.5.2 Event Handlers `P4` `1h`

- `checkout.session.completed` → Create subscription record
- `customer.subscription.updated` → Sync status, period dates
- `customer.subscription.deleted` → Mark as canceled
- `invoice.payment_failed` → Update status to past_due
- `invoice.paid` → Update status to active

---

### 5.6 Usage Tracking `P4` `2h`

#### 5.6.1 Usage Service `P4` `1h`

- **File**: `src/lib/services/server/usage.service.ts`
- `trackUsage(orgId, metric, quantity)` - Record usage
- `getUsage(orgId, metric, periodStart)` - Get current period usage
- `resetUsage(orgId)` - Called on billing period start

#### 5.6.2 Integration Points `P4` `1h`

- Track in `optimization.service.ts` → increment 'optimizations'
- Track in stop import → increment 'stops_imported'
- Track in API routes (optional) → increment 'api_calls'

---

### 5.7 Limit Enforcement `P4` `2h`

#### 5.7.1 Limit Checking `P4` `1h`

- **File**: `src/lib/services/server/limits.service.ts`
- `checkLimit(orgId, metric)` → { allowed: boolean, current: number, limit: number }
- `requireLimit(orgId, metric)` → throws ServiceError.forbidden if exceeded

#### 5.7.2 Apply to Services `P4` `30m`

- Map creation: check maps limit
- Stop import: check stops per map limit
- Driver creation: check drivers limit
- Optimization: check optimizations limit

#### 5.7.3 Graceful Degradation `P4` `30m`

- Free tier soft limits (warn at 80%, block at 100%)
- Past-due subscriptions: read-only mode

---

### 5.8 Billing UI `P4` `3h`

#### 5.8.1 Billing Settings Page `P4` `1h`

- **Route**: `/settings/billing`
- Current plan display
- Usage meters (stops, maps, drivers)
- Upgrade/downgrade buttons
- Manage payment method link (Stripe Portal)

#### 5.8.2 Upgrade Prompts `P4` `1h`

- **Component**: `src/lib/components/UpgradePrompt.svelte`
- Show when approaching limits
- Contextual messaging based on which limit hit
- CTA to billing page

#### 5.8.3 Plan Comparison `P4` `1h`

- **Component**: `src/lib/components/PlanComparison.svelte`
- Feature comparison table
- Pricing display
- Highlight current plan

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
