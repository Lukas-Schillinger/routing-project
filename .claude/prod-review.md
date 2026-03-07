# Production Review — Security & Infrastructure Audit

Generated: 2026-03-07

---

## Issues

### Security Headers

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 1 | **Urgent** | Backend | Improvement | Missing Content-Security-Policy (CSP) header | No CSP headers configured anywhere. Leaves the app vulnerable to XSS via inline scripts or unauthorized third-party resources. | `src/hooks.server.ts` (add here) |
| 2 | **High** | Backend | Improvement | Missing HSTS header (`Strict-Transport-Security`) | Without HSTS, browsers may allow HTTP connections on first visit, enabling SSL-stripping attacks. | `src/hooks.server.ts` |
| 3 | **High** | Backend | Improvement | Missing `X-Frame-Options` header | No clickjacking protection. Attackers can embed the app in an iframe on a malicious site. | `src/hooks.server.ts` |
| 4 | **High** | Backend | Improvement | Missing `X-Content-Type-Options: nosniff` header | Browsers may MIME-sniff responses, potentially interpreting uploaded content as executable. | `src/hooks.server.ts` |

### Authentication & Session

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 5 | **Urgent** | Backend | Feature | No account lockout after failed login attempts | Rate limiting (10 req/min on auth endpoints) provides some protection, but a determined attacker can rotate IPs. Per-user lockout after N failures is missing. | `src/lib/services/server/auth.ts`, `src/routes/(app)/auth/login/+page.server.ts` |
| 6 | **High** | Backend | Improvement | CSRF protection relies on SvelteKit defaults — not explicitly verified | No CSRF tokens found in the codebase. SvelteKit has built-in origin checking, but the config (`svelte.config.js`) does not explicitly enable or configure it. Should be verified and documented. | `svelte.config.js`, `src/hooks.server.ts` |
| 7 | **Med** | Backend | Improvement | Session expiry window is long (30 days) | Sessions last 30 days with auto-renewal at 15 days. For a business app handling route/driver PII, consider shorter sessions or idle timeout. | `src/lib/services/server/auth.ts` |

### CORS

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 8 | **Med** | Backend | Improvement | No explicit CORS configuration | Relies entirely on default browser same-origin policy. Should be explicitly configured to document intent and prevent accidental misconfiguration if a reverse proxy is added later. | `src/hooks.server.ts` |

### Cryptography & Secrets

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 9 | **Med** | Backend | Improvement | Timing-safe comparison used inconsistently | Only the optimization webhook uses `timingSafeEqual()` for secret comparison. Other token/secret comparisons may rely on standard equality, which is vulnerable to timing attacks. | `src/routes/api/webhooks/complete-optimization/+server.ts` |
| 10 | **Low** | Infra | Improvement | No documented key/secret rotation procedure | Environment variables contain long-lived secrets (Stripe keys, AWS credentials, webhook secrets). No rotation schedule or runbook documented. | `src/lib/server/env.ts` |
| 11 | **Low** | Backend | Improvement | No application-level encryption at rest for PII | Driver names, phone numbers, and addresses stored in plaintext in the database. Relies entirely on Supabase/PostgreSQL disk encryption. | `src/lib/server/db/schema.ts` |

### Rate Limiting

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 12 | **Med** | Backend | Improvement | Rate limiting is IP-based only — no per-user rate limiting | Attackers using distributed IPs (botnets, cloud functions) can bypass IP-based limits. Adding per-user limits for authenticated endpoints would provide defense in depth. | `src/lib/server/rate-limit.ts`, `src/hooks.server.ts` |

### Webhook Security

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 13 | **Low** | Backend | Improvement | Optimization webhook uses custom HMAC verification | Stripe and Resend webhooks use their respective SDK verification methods. The optimization webhook implements its own Bearer token verification. Consider using a standard HMAC signature scheme for consistency. | `src/routes/api/webhooks/complete-optimization/+server.ts` |

### Input Validation

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 14 | **Low** | Backend | Improvement | No explicit HTML sanitization layer | Relies entirely on Svelte's built-in output escaping. This is safe for Svelte-rendered content, but any raw HTML injection point (e.g. `{@html}`) would be unprotected. Audit for `{@html}` usage. | `src/lib/schemas/common.ts`, all `.svelte` files |

### Monitoring & Observability

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 15 | **Med** | Infra | Feature | No security event alerting | Failed login attempts, rate limit hits, and webhook signature failures are logged but not aggregated into alerts. Consider adding Sentry alerts or a dedicated security monitoring channel. | `src/hooks.server.ts`, `src/lib/server/rate-limit.ts` |

### Multi-Tenancy

| # | Priority | Area | Type | Issue | Details | Location |
|---|----------|------|------|-------|---------|----------|
| 16 | **Low** | Backend | Improvement | Tenancy enforcement is convention-based, not structural | Every query must manually filter by `organization_id`. A missed filter is a data leak. Consider a database-level RLS policy or middleware that injects the tenant filter automatically. | `src/lib/services/server/*.service.ts` |

---

## Strengths (no action needed — documented for reference)

| Area | Detail | Location |
|------|--------|----------|
| Password hashing | Argon2id with strong params (memoryCost: 19456, timeCost: 2, outputLen: 32) | `src/lib/config.ts` |
| Session tokens | SHA-256 hashed before storage, never stored raw | `src/lib/services/server/auth.ts` |
| OTP/magic link codes | SHA-256 hashed, 15-minute expiry | Auth flow |
| Password reset | Invalidates all sessions across devices | `src/routes/(app)/auth/redeem/password-reset/+page.server.ts` |
| Email enumeration protection | Generic messages for wrong email/password and password reset | `src/routes/(app)/auth/login/+page.server.ts` |
| Cookie flags | `httpOnly`, `secure` (prod), `sameSite: lax` | Auth flow |
| Rate limiting coverage | Auth: 10/min, forms: 30/min, API: 100/min with proper headers | `src/lib/server/rate-limit.ts` |
| Webhook verification | Stripe (SDK), Resend (Svix), Optimization (timing-safe Bearer) | `src/routes/api/webhooks/` |
| Audit trail | `created_by` / `updated_by` on all records | `src/lib/server/db/schema.ts` |
| Password hash exclusion | `publicUserColumns` strips `passwordHash` from all API responses | `src/lib/services/server/user.service.ts:18-30` |
| Structured logging | Pino with request ID, userId, orgId context | `src/hooks.server.ts`, `src/lib/server/logger.ts` |
| Error reporting | Sentry captures unexpected errors only; expected errors (4xx) suppressed | `src/lib/errors.ts` |
| Env validation | Zod schema crashes on missing vars at startup | `src/lib/server/env.ts` |
| Tenant isolation | All queries filter by `organization_id`; never trusted from request body | All server services |

---

## Priority Summary

| Priority | Count |
|----------|-------|
| Urgent   | 2     |
| High     | 3     |
| Med      | 4     |
| Low      | 5     |
| **Total** | **16** |
