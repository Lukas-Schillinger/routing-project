/**
 * Unified error class for the application
 * Used on both server (thrown by services) and client (thrown by API wrapper)
 */

import * as Sentry from '@sentry/sveltekit';
import { error } from '@sveltejs/kit';
import { ZodError } from 'zod';

export type ServiceErrorCode =
	| 'NOT_FOUND'
	| 'FORBIDDEN'
	| 'CONFLICT'
	| 'VALIDATION'
	| 'UNAUTHORIZED'
	| 'BAD_REQUEST'
	| 'INTERNAL_ERROR'
	| 'NETWORK_ERROR'
	| 'UNKNOWN';

/**
 * Expected error codes - these are normal application behavior and don't need Sentry alerts
 */
const EXPECTED_CODES: ServiceErrorCode[] = [
	'NOT_FOUND',
	'FORBIDDEN',
	'CONFLICT',
	'VALIDATION',
	'UNAUTHORIZED',
	'BAD_REQUEST'
];

export class ServiceError extends Error {
	constructor(
		message: string,
		public code: ServiceErrorCode,
		public statusCode: number = 400,
		options?: ErrorOptions
	) {
		super(message, options);
		this.name = 'ServiceError';
	}

	/**
	 * Create a NOT_FOUND error (404)
	 * Examples: Map not found, Stop doesn't exist, User with email not found
	 */
	static notFound(message: string, options?: ErrorOptions): ServiceError {
		return new ServiceError(message, 'NOT_FOUND', 404, options);
	}

	/**
	 * Create a FORBIDDEN error (403)
	 * Examples: Accessing another organization's data, Insufficient permissions to delete map
	 */
	static forbidden(message: string, options?: ErrorOptions): ServiceError {
		return new ServiceError(message, 'FORBIDDEN', 403, options);
	}

	/**
	 * Create a CONFLICT error (409)
	 * Examples: Duplicate email address, Driver already assigned to this map
	 */
	static conflict(message: string, options?: ErrorOptions): ServiceError {
		return new ServiceError(message, 'CONFLICT', 409, options);
	}

	/**
	 * Create a VALIDATION error (400)
	 * Examples: Invalid email format, Required field missing, Coordinates out of range
	 */
	static validation(message: string, options?: ErrorOptions): ServiceError {
		return new ServiceError(message, 'VALIDATION', 400, options);
	}

	/**
	 * Create an UNAUTHORIZED error (401)
	 * Examples: Missing auth token, Invalid session, Login required
	 */
	static unauthorized(message: string, options?: ErrorOptions): ServiceError {
		return new ServiceError(message, 'UNAUTHORIZED', 401, options);
	}

	/**
	 * Create a BAD_REQUEST error (400)
	 * Examples: Malformed request body, Invalid optimization parameters
	 */
	static badRequest(message: string, options?: ErrorOptions): ServiceError {
		return new ServiceError(message, 'BAD_REQUEST', 400, options);
	}

	/**
	 * Create an INTERNAL_ERROR (500)
	 * Examples: Database connection failed, External API timeout, Geocoding service unavailable
	 */
	static internal(message: string, options?: ErrorOptions): ServiceError {
		return new ServiceError(message, 'INTERNAL_ERROR', 500, options);
	}

	/**
	 * Construct from API response data (used by client API wrapper)
	 */
	static fromResponse(
		status: number,
		data: { code?: string; message?: string }
	): ServiceError {
		const code = (data.code as ServiceErrorCode) || 'UNKNOWN';
		const message = data.message || 'An error occurred';
		return new ServiceError(message, code, status);
	}
}

/**
 * Capture unexpected client-side errors to Sentry.
 * Expected ServiceErrors (which the server already reported) are skipped.
 */
export function captureClientError(err: unknown): void {
	if (err instanceof ServiceError && EXPECTED_CODES.includes(err.code)) {
		return;
	}
	Sentry.captureException(err);
}

/**
 * Handle errors in API routes consistently.
 * - Expected errors (NOT_FOUND, VALIDATION, etc.) → return HTTP response, no Sentry
 * - Unexpected errors (INTERNAL_ERROR, unknown) → capture to Sentry, return 500
 */
export function handleApiError(err: unknown, fallbackMessage: string): never {
	if (err instanceof ServiceError) {
		const isExpected = EXPECTED_CODES.includes(err.code);

		if (!isExpected) {
			// Unexpected ServiceError - capture to Sentry with original cause if available
			Sentry.captureException(err.cause ?? err, {
				tags: { serviceErrorCode: err.code },
				extra: { serviceErrorMessage: err.message }
			});
		}

		error(err.statusCode, { code: err.code, message: err.message });
	}

	if (err instanceof ZodError) {
		// Validation errors are expected - no Sentry
		const messages = err.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join(', ');
		error(400, { code: 'VALIDATION', message: messages });
	}

	// Unknown error - always capture to Sentry
	Sentry.captureException(err, { extra: { fallbackMessage } });
	error(500, { code: 'INTERNAL_ERROR', message: fallbackMessage });
}

/**
 * Handle errors in webhook routes consistently.
 * Webhooks need to return JSON responses (not throw), so this returns an object.
 */
export function handleWebhookError(
	err: unknown,
	webhookName: string,
	context?: Record<string, unknown>
): {
	body: { success: false; error: string; details?: unknown };
	status: number;
} {
	// ZodError is also expected (validation errors from webhook payloads)
	const isExpected =
		err instanceof ZodError ||
		(err instanceof ServiceError && EXPECTED_CODES.includes(err.code));

	if (!isExpected) {
		// Capture unexpected errors to Sentry
		const errorToCapture =
			err instanceof ServiceError ? (err.cause ?? err) : err;

		Sentry.captureException(errorToCapture, {
			tags: { webhook: webhookName },
			extra: {
				...context,
				...(err instanceof ServiceError && {
					serviceErrorCode: err.code,
					serviceErrorMessage: err.message
				})
			}
		});
	}

	if (err instanceof ZodError) {
		return {
			body: { success: false, error: 'Invalid payload', details: err.issues },
			status: 400
		};
	}

	if (err instanceof ServiceError) {
		return {
			body: { success: false, error: err.message },
			status: err.statusCode
		};
	}

	return {
		body: { success: false, error: 'Internal error' },
		status: 500
	};
}
