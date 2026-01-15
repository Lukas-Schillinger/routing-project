import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError, z } from 'zod';

// Mock Sentry before importing errors module
vi.mock('@sentry/sveltekit', () => ({
	captureException: vi.fn()
}));

// Mock SvelteKit error function
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status: number, body: unknown) => {
		const err = new Error(`HTTP ${status}`);
		(err as unknown as { status: number; body: unknown }).status = status;
		(err as unknown as { status: number; body: unknown }).body = body;
		throw err;
	})
}));

import * as Sentry from '@sentry/sveltekit';
import { ServiceError, handleApiError, handleWebhookError } from './errors';

describe('ServiceError', () => {
	describe('factory methods', () => {
		it('creates NOT_FOUND error with 404 status', () => {
			const error = ServiceError.notFound('Resource not found');
			expect(error.code).toBe('NOT_FOUND');
			expect(error.statusCode).toBe(404);
			expect(error.message).toBe('Resource not found');
		});

		it('creates FORBIDDEN error with 403 status', () => {
			const error = ServiceError.forbidden('Access denied');
			expect(error.code).toBe('FORBIDDEN');
			expect(error.statusCode).toBe(403);
		});

		it('creates CONFLICT error with 409 status', () => {
			const error = ServiceError.conflict('Duplicate entry');
			expect(error.code).toBe('CONFLICT');
			expect(error.statusCode).toBe(409);
		});

		it('creates VALIDATION error with 400 status', () => {
			const error = ServiceError.validation('Invalid input');
			expect(error.code).toBe('VALIDATION');
			expect(error.statusCode).toBe(400);
		});

		it('creates UNAUTHORIZED error with 401 status', () => {
			const error = ServiceError.unauthorized('Login required');
			expect(error.code).toBe('UNAUTHORIZED');
			expect(error.statusCode).toBe(401);
		});

		it('creates BAD_REQUEST error with 400 status', () => {
			const error = ServiceError.badRequest('Malformed request');
			expect(error.code).toBe('BAD_REQUEST');
			expect(error.statusCode).toBe(400);
		});

		it('creates INTERNAL_ERROR with 500 status', () => {
			const error = ServiceError.internal('Something went wrong');
			expect(error.code).toBe('INTERNAL_ERROR');
			expect(error.statusCode).toBe(500);
		});
	});

	describe('cause chaining', () => {
		it('preserves original error as cause', () => {
			const originalError = new Error('Database connection failed');
			const serviceError = ServiceError.internal('Failed to save', {
				cause: originalError
			});

			expect(serviceError.cause).toBe(originalError);
			expect((serviceError.cause as Error).message).toBe(
				'Database connection failed'
			);
		});

		it('fromResponse creates error from API response', () => {
			const error = ServiceError.fromResponse(404, {
				code: 'NOT_FOUND',
				message: 'User not found'
			});

			expect(error.code).toBe('NOT_FOUND');
			expect(error.statusCode).toBe(404);
			expect(error.message).toBe('User not found');
		});

		it('fromResponse handles missing code/message', () => {
			const error = ServiceError.fromResponse(500, {});

			expect(error.code).toBe('UNKNOWN');
			expect(error.message).toBe('An error occurred');
		});
	});
});

describe('handleApiError', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('expected errors (no Sentry)', () => {
		const expectedCodes = [
			'NOT_FOUND',
			'FORBIDDEN',
			'CONFLICT',
			'VALIDATION',
			'UNAUTHORIZED',
			'BAD_REQUEST'
		] as const;

		expectedCodes.forEach((code) => {
			it(`does NOT send ${code} errors to Sentry`, () => {
				const error = new ServiceError(`Test ${code}`, code, 400);

				expect(() => handleApiError(error, 'fallback')).toThrow();
				expect(Sentry.captureException).not.toHaveBeenCalled();
			});
		});
	});

	describe('unexpected errors (sent to Sentry)', () => {
		it('sends INTERNAL_ERROR to Sentry', () => {
			const error = ServiceError.internal('Database crashed');

			expect(() => handleApiError(error, 'fallback')).toThrow();
			expect(Sentry.captureException).toHaveBeenCalledTimes(1);
			expect(Sentry.captureException).toHaveBeenCalledWith(error, {
				tags: { serviceErrorCode: 'INTERNAL_ERROR' },
				extra: { serviceErrorMessage: 'Database crashed' }
			});
		});

		it('sends cause to Sentry when available', () => {
			const originalError = new Error('Connection timeout');
			const error = ServiceError.internal('Database failed', {
				cause: originalError
			});

			expect(() => handleApiError(error, 'fallback')).toThrow();
			expect(Sentry.captureException).toHaveBeenCalledWith(originalError, {
				tags: { serviceErrorCode: 'INTERNAL_ERROR' },
				extra: { serviceErrorMessage: 'Database failed' }
			});
		});

		it('sends unknown errors to Sentry', () => {
			const unknownError = new Error('Something unexpected');

			expect(() => handleApiError(unknownError, 'Fallback message')).toThrow();
			expect(Sentry.captureException).toHaveBeenCalledWith(unknownError, {
				extra: { fallbackMessage: 'Fallback message' }
			});
		});
	});

	describe('ZodError handling', () => {
		it('does NOT send ZodError to Sentry (validation is expected)', () => {
			const schema = z.object({ name: z.string() });

			try {
				schema.parse({ name: 123 });
			} catch (err) {
				expect(() => handleApiError(err, 'fallback')).toThrow();
				expect(Sentry.captureException).not.toHaveBeenCalled();
			}
		});

		it('formats ZodError messages correctly', () => {
			const schema = z.object({
				email: z.string().email(),
				age: z.number().min(0)
			});

			try {
				schema.parse({ email: 'invalid', age: -5 });
			} catch (err) {
				try {
					handleApiError(err, 'fallback');
				} catch (httpError) {
					const body = (httpError as { body: { message: string } }).body;
					expect(body.message).toContain('email');
					expect(body.message).toContain('age');
				}
			}
		});
	});
});

describe('handleWebhookError', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('expected errors (no Sentry)', () => {
		it('does NOT send expected ServiceError to Sentry', () => {
			const error = ServiceError.badRequest('Missing headers');

			const result = handleWebhookError(error, 'test-webhook');

			expect(Sentry.captureException).not.toHaveBeenCalled();
			expect(result.status).toBe(400);
			expect(result.body).toEqual({
				success: false,
				error: 'Missing headers'
			});
		});
	});

	describe('unexpected errors (sent to Sentry)', () => {
		it('sends INTERNAL_ERROR to Sentry with webhook tag', () => {
			const error = ServiceError.internal('Queue failed');

			const result = handleWebhookError(error, 'optimization-webhook', {
				jobId: '123'
			});

			expect(Sentry.captureException).toHaveBeenCalledWith(error, {
				tags: { webhook: 'optimization-webhook' },
				extra: {
					jobId: '123',
					serviceErrorCode: 'INTERNAL_ERROR',
					serviceErrorMessage: 'Queue failed'
				}
			});
			expect(result.status).toBe(500);
		});

		it('sends cause to Sentry when available', () => {
			const originalError = new Error('SQS timeout');
			const error = ServiceError.internal('Failed to queue', {
				cause: originalError
			});

			handleWebhookError(error, 'test-webhook');

			expect(Sentry.captureException).toHaveBeenCalledWith(
				originalError,
				expect.objectContaining({
					tags: { webhook: 'test-webhook' }
				})
			);
		});

		it('sends unknown errors to Sentry', () => {
			const unknownError = new Error('Unexpected failure');

			const result = handleWebhookError(unknownError, 'mail-webhook');

			expect(Sentry.captureException).toHaveBeenCalledWith(unknownError, {
				tags: { webhook: 'mail-webhook' },
				extra: {}
			});
			expect(result.status).toBe(500);
			expect(result.body).toEqual({
				success: false,
				error: 'Internal error'
			});
		});
	});

	describe('ZodError handling', () => {
		it('does NOT send ZodError to Sentry', () => {
			const zodError = new ZodError([
				{
					code: 'invalid_type',
					expected: 'string',
					path: ['email_id'],
					message: 'Expected string, received number'
				}
			]);

			const result = handleWebhookError(zodError, 'test-webhook');

			expect(Sentry.captureException).not.toHaveBeenCalled();
			expect(result.status).toBe(400);
			expect(result.body).toEqual({
				success: false,
				error: 'Invalid payload',
				details: zodError.issues
			});
		});
	});

	describe('response format', () => {
		it('returns consistent error response structure', () => {
			const error = ServiceError.unauthorized('Invalid signature');

			const result = handleWebhookError(error, 'webhook');

			expect(result).toEqual({
				body: { success: false, error: 'Invalid signature' },
				status: 401
			});
		});
	});
});
