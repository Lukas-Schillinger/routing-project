/**
 * Test Database Helper
 * Provides transaction isolation for tests - all changes are rolled back after each test.
 */
import { db, withTransaction } from '$lib/server/db';

/**
 * Custom error thrown to trigger transaction rollback.
 * This is caught internally and not propagated to the test.
 */
class RollbackError extends Error {
	constructor() {
		super('ROLLBACK');
		this.name = 'RollbackError';
	}
}

/**
 * Wraps a test function in a database transaction that is always rolled back.
 * All db operations (including those in services) automatically use the transaction
 * via the AsyncLocalStorage context.
 *
 * @example
 * ```ts
 * it('creates a user', async () => {
 *   await withTestTransaction(async () => {
 *     // Services automatically use the transaction!
 *     const org = await createOrganization();
 *     const result = await userService.createUser({ ... }, org.id);
 *     expect(result.email).toContain('@');
 *     // No cleanup needed - auto rollback!
 *   });
 * });
 * ```
 */
export async function withTestTransaction<T>(fn: () => Promise<T>): Promise<T> {
	let result: T;

	try {
		await withTransaction(async () => {
			result = await fn();
			throw new RollbackError();
		});
	} catch (error) {
		if (error instanceof RollbackError) {
			return result!;
		}
		throw error;
	}

	return result!;
}

/**
 * Re-export db for cases where you need direct access
 */
export { db };
