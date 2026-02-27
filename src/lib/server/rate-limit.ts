import { env } from '$env/dynamic/private';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Abstract interface for swapping backends
export type RateLimitResult = {
	success: boolean;
	remaining: number;
	resetMs: number;
};

export type RateLimiter = {
	limit(key: string): Promise<RateLimitResult>;
};

// Shared Redis instance
const redis = new Redis({
	url: env.UPSTASH_REDIS_REST_URL!,
	token: env.UPSTASH_REDIS_REST_TOKEN!
});

function createLimiter(
	points: number,
	windowSeconds: number,
	prefix: string
): RateLimiter {
	const limiter = new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(points, `${windowSeconds} s`),
		prefix: `ratelimit:${prefix}`,
		analytics: false
	});

	return {
		async limit(key: string): Promise<RateLimitResult> {
			const result = await limiter.limit(key);
			return {
				success: result.success,
				remaining: result.remaining,
				resetMs: result.reset - Date.now()
			};
		}
	};
}

// General API: 100 per minute
const apiLimiter = createLimiter(100, 60, 'api');

// Auth form actions: 10 per minute (brute-force prevention)
const authLimiter = createLimiter(10, 60, 'auth');

// General form actions: 30 per minute
const formLimiter = createLimiter(30, 60, 'form');

export function getLimiterForPath(
	pathname: string,
	method: string
): RateLimiter | null {
	// Sentry tunnel excluded - proxied responses have immutable headers
	if (pathname === '/api/sentry-tunnel') {
		return null;
	}
	if (pathname.startsWith('/api/')) {
		return apiLimiter;
	}

	// Rate limit form actions (POST) on page routes — GET (page loads) pass through
	if (method === 'POST') {
		if (pathname.startsWith('/auth/')) return authLimiter;
		return formLimiter;
	}

	return null;
}
