/**
 * Common error class for server-side services
 * Provides consistent error handling across all service layers
 */

export type ServiceErrorCode =
	| 'NOT_FOUND'
	| 'FORBIDDEN'
	| 'CONFLICT'
	| 'VALIDATION'
	| 'UNAUTHORIZED'
	| 'BAD_REQUEST'
	| 'INTERNAL_ERROR';

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
	 */
	static notFound(message: string): ServiceError {
		return new ServiceError(message, 'NOT_FOUND', 404);
	}

	/**
	 * Create a FORBIDDEN error (403)
	 */
	static forbidden(message: string): ServiceError {
		return new ServiceError(message, 'FORBIDDEN', 403);
	}

	/**
	 * Create a CONFLICT error (409)
	 */
	static conflict(message: string): ServiceError {
		return new ServiceError(message, 'CONFLICT', 409);
	}

	/**
	 * Create a VALIDATION error (400)
	 */
	static validation(message: string): ServiceError {
		return new ServiceError(message, 'VALIDATION', 400);
	}

	/**
	 * Create an UNAUTHORIZED error (401)
	 */
	static unauthorized(message: string): ServiceError {
		return new ServiceError(message, 'UNAUTHORIZED', 401);
	}

	/**
	 * Create a BAD_REQUEST error (400)
	 */
	static badRequest(message: string): ServiceError {
		return new ServiceError(message, 'BAD_REQUEST', 400);
	}

	/**
	 * Create an INTERNAL_ERROR (500)
	 */
	static internal(message: string): ServiceError {
		return new ServiceError(message, 'INTERNAL_ERROR', 500);
	}
}
