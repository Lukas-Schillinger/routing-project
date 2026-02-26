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

export function getLimiterForPath(pathname: string): RateLimiter | null {
	// Sentry tunnel excluded - proxied responses have immutable headers
	if (pathname === '/api/sentry-tunnel') {
		return null;
	}
	if (pathname.startsWith('/api/')) {
		return apiLimiter;
	}
	return null;
}
