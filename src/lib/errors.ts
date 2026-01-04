/**
 * Unified error class for the application
 * Used on both server (thrown by services) and client (thrown by API wrapper)
 */

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

export class ServiceError extends Error {
	constructor(
		message: string,
		public code: ServiceErrorCode,
		public statusCode: number = 400
	) {
		super(message);
		this.name = 'ServiceError';
	}

	/**
	 * Create a NOT_FOUND error (404)
	 * Examples: Map not found, Stop doesn't exist, User with email not found
	 */
	static notFound(message: string): ServiceError {
		return new ServiceError(message, 'NOT_FOUND', 404);
	}

	/**
	 * Create a FORBIDDEN error (403)
	 * Examples: Accessing another organization's data, Insufficient permissions to delete map
	 */
	static forbidden(message: string): ServiceError {
		return new ServiceError(message, 'FORBIDDEN', 403);
	}

	/**
	 * Create a CONFLICT error (409)
	 * Examples: Duplicate email address, Driver already assigned to this map
	 */
	static conflict(message: string): ServiceError {
		return new ServiceError(message, 'CONFLICT', 409);
	}

	/**
	 * Create a VALIDATION error (400)
	 * Examples: Invalid email format, Required field missing, Coordinates out of range
	 */
	static validation(message: string): ServiceError {
		return new ServiceError(message, 'VALIDATION', 400);
	}

	/**
	 * Create an UNAUTHORIZED error (401)
	 * Examples: Missing auth token, Invalid session, Login required
	 */
	static unauthorized(message: string): ServiceError {
		return new ServiceError(message, 'UNAUTHORIZED', 401);
	}

	/**
	 * Create a BAD_REQUEST error (400)
	 * Examples: Malformed request body, Invalid optimization parameters
	 */
	static badRequest(message: string): ServiceError {
		return new ServiceError(message, 'BAD_REQUEST', 400);
	}

	/**
	 * Create an INTERNAL_ERROR (500)
	 * Examples: Database connection failed, External API timeout, Geocoding service unavailable
	 */
	static internal(message: string): ServiceError {
		return new ServiceError(message, 'INTERNAL_ERROR', 500);
	}

	/**
	 * Construct from API response data (used by client API wrapper)
	 */
	static fromResponse(status: number, data: { code?: string; message?: string }): ServiceError {
		const code = (data.code as ServiceErrorCode) || 'UNKNOWN';
		const message = data.message || 'An error occurred';
		return new ServiceError(message, code, status);
	}
}

/**
 * Handle errors in API routes consistently.
 * Converts ServiceError and ZodError to SvelteKit errors with proper codes.
 */
export function handleApiError(err: unknown, fallbackMessage: string): never {
	if (err instanceof ServiceError) {
		error(err.statusCode, { code: err.code, message: err.message });
	}

	if (err instanceof ZodError) {
		const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
		error(400, { code: 'VALIDATION', message: messages });
	}

	console.error(fallbackMessage, err);
	error(500, { code: 'INTERNAL_ERROR', message: fallbackMessage });
}
