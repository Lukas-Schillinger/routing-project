/**
 * Test Database Helper
 * Provides transaction isolation for tests - all changes are rolled back after each test.
 */
import { db } from '$lib/server/db';
import type * as schema from '$lib/server/db/schema';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

/**
 * Transaction type for test functions.
 * Use this type when accepting a transaction parameter in factories/helpers.
 */
export type TestTransaction = PgTransaction<
	PostgresJsQueryResultHKT,
	typeof schema,
	ExtractTablesWithRelations<typeof schema>
>;

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
 * This provides test isolation - any database changes are automatically undone.
 *
 * @example
 * ```ts
 * it('creates a user', async () => {
 *   await withTestTransaction(async (tx) => {
 *     const org = await createOrganization(tx);
 *     const user = await createUser(tx, { organization_id: org.id });
 *     expect(user.email).toContain('@');
 *   });
 * });
 * ```
 */
export async function withTestTransaction<T>(
	fn: (tx: TestTransaction) => Promise<T>
): Promise<T> {
	let result: T;

	try {
		await db.transaction(async (tx) => {
			result = await fn(tx as TestTransaction);
			// Always rollback by throwing - this is the cleanest way in Drizzle
			throw new RollbackError();
		});
	} catch (error) {
		if (error instanceof RollbackError) {
			// Expected - transaction was rolled back successfully
			return result!;
		}
		// Re-throw unexpected errors
		throw error;
	}

	// This shouldn't be reached, but TypeScript needs it
	return result!;
}

/**
 * Re-export db for cases where you need direct access (e.g., setup scripts)
 */
export { db };
