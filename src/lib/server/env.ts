/**
 * Environment variable validation
 *
 * This module validates required environment variables at server startup.
 * Import this module once in hooks.server.ts to trigger validation.
 *
 * All other code should continue using:
 *   import { env } from '$env/dynamic/private'
 */
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { z } from 'zod';

const requiredEnvSchema = z.object({
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
	UPSTASH_REDIS_REST_TOKEN: z.string().min(1)
});

const optionalEnvSchema = z.object({
	// Webhook secrets (graceful degradation - webhooks return 500 if missing)
	RESEND_WEBHOOK_SECRET: z.string().optional(),
	OPTIMIZATION_WEBHOOK_SECRET: z.string().optional(),

	// Infrastructure
	CF_TUNNEL_URL: z.string().optional(),
	CLOUDFLARE_R2_PRIVATE_BUCKET_NAME: z.string().optional(),
	CLOUDFLARE_TOKEN_VALUE: z.string().optional()
});

const publicEnvSchema = z.object({
	// Sentry - when empty, SDK becomes a no-op (safe for local development)
	PUBLIC_SENTRY_DSN: z.string().optional()
});

const envSchema = requiredEnvSchema.merge(optionalEnvSchema);

// Validate on module load (side effect)
const result = envSchema.safeParse(env);
const publicResult = publicEnvSchema.safeParse(publicEnv);

if (!result.success || !publicResult.success) {
	const privateIssues = result.success ? [] : result.error.issues;
	const publicIssues = publicResult.success ? [] : publicResult.error.issues;
	const allIssues = [...privateIssues, ...publicIssues];

	const missing = allIssues.map((issue) => `    ${issue.path[0]}`).join('\n');

	const message = `
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ✖ Environment validation failed                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Missing or invalid:                                   │
│                                                         │
${missing}
│                                                         │
│   Check your .env file or environment configuration.    │
│                                                         │
└─────────────────────────────────────────────────────────┘
`;

	throw new Error(message);
}
