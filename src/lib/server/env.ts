/**
 * Environment variable validation
 *
 * Validates all environment variables at server startup.
 * Import this module once in hooks.server.ts to trigger validation.
 */
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { z } from 'zod';

const requiredSchema = z.object({
	// Database
	DATABASE_URL: z.string().min(1),

	// Mapbox
	MAPBOX_ACCESS_TOKEN: z.string().min(1),

	// Email - Resend
	RESEND_API_KEY: z.string().min(1),
	EMAIL_FROM: z.string(),

	// Email - Render service
	RENDER_SERVICE_URL: z.string().url(),
	RENDER_TOKEN_WEND: z.string().min(1),

	// Cloudflare R2
	CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
	CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().min(1),
	CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().min(1),
	CLOUDFLARE_R2_DEV_BUCKET_NAME: z.string().min(1),

	// AWS SQS
	AWS_REGION: z.string().min(1),
	AWS_ACCESS_KEY_ID: z.string().min(1),
	AWS_SECRET_ACCESS_KEY: z.string().min(1),
	OPTIMIZATION_QUEUE_URL: z.string().url(),

	// Rate limiting - Upstash Redis
	UPSTASH_REDIS_REST_URL: z.string().url(),
	UPSTASH_REDIS_REST_TOKEN: z.string().min(1),

	// Stripe
	STRIPE_SECRET_KEY: z.string().min(1),
	STRIPE_FREE_PLAN_PRICE_ID: z.string().min(1),
	STRIPE_PRO_PLAN_PRICE_ID: z.string().min(1),
	STRIPE_CREDIT_PRICE_ID: z.string().min(1),

	// Maps (public)
	PUBLIC_MAPTILER_KEY: z.string().min(1),
	PUBLIC_MAPBOX_STATIC_MAP_TOKEN: z.string().min(1),

	// Cloudflare R2 public bucket
	PUBLIC_CLOUDFLARE_R2_BUCKET_NAME: z.string().min(1),
	PUBLIC_CLOUDFLARE_R2_URL: z.string().url()
});

const optionalSchema = z.object({
	// Admin
	ADMIN_EMAILS: z.string().optional(), // Comma-separated list of admin emails

	// Webhook secrets
	RESEND_WEBHOOK_SECRET: z.string().optional(),
	OPTIMIZATION_WEBHOOK_SECRET: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),

	// Infrastructure
	CF_TUNNEL_URL: z.string().optional(),
	CLOUDFLARE_R2_PRIVATE_BUCKET_NAME: z.string().optional(),
	CLOUDFLARE_TOKEN_VALUE: z.string().optional(),

	// Sentry source maps (build-time only)
	SENTRY_ORG: z.string().optional(),
	SENTRY_PROJECT: z.string().optional(),
	SENTRY_AUTH_TOKEN: z.string().optional(),

	// Sentry DSN - when empty, SDK becomes a no-op
	PUBLIC_SENTRY_DSN: z.string().optional()
});

const schema = requiredSchema.merge(optionalSchema);
const allEnv = { ...env, ...publicEnv };
const result = schema.safeParse(allEnv);

if (!result.success) {
	const issues = result.error.issues
		.map((issue) => `    ${String(issue.path[0])}: ${issue.message}`)
		.join('\n');
	throw new Error(`
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ✖ Environment validation failed                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Missing or invalid:                                   │
│                                                         │
${issues}
│                                                         │
│   Check your .env file or environment configuration.    │
│                                                         │
└─────────────────────────────────────────────────────────┘
`);
}
