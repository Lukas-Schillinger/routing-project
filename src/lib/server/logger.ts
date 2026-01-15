import pino from 'pino';
import { dev } from '$app/environment';

/**
 * Pino structured logger for server-side logging
 *
 * Log levels:
 * - error: Failed operations, exceptions
 * - warn: Unexpected but recoverable (job cancelled, rate limit)
 * - info: Business events (job created, webhook received, request completed)
 * - debug: Development details
 */

const logLevel = dev ? 'debug' : process.env.LOG_LEVEL || 'info';

export const logger = pino({
	level: logLevel,
	formatters: {
		level: (label) => ({ level: label })
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	// Pretty print in development only
	...(dev && {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				translateTime: 'HH:MM:ss',
				ignore: 'pid,hostname'
			}
		}
	})
});

export type RequestLoggerContext = {
	requestId: string;
	path?: string;
	method?: string;
};

/**
 * Create a child logger with request context bound
 */
export function createRequestLogger(ctx: RequestLoggerContext) {
	return logger.child(ctx);
}
