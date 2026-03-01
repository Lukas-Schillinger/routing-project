import { AsyncLocalStorage } from 'async_hooks';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';

dotenv.config();
import postgres from 'postgres';
import * as schema from './schema';

/* We're using process.env instead of svelte's $env in order to use the DB in playwright tests.  */
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(process.env.DATABASE_URL);
const realDb = drizzle(client, { schema });

/**
 * Stores the current transaction for the async context.
 * When code runs inside withTransaction(), this contains the active transaction.
 */
const txStorage = new AsyncLocalStorage<typeof realDb>();

/**
 * Context-aware database connection.
 *
 * In normal operation, behaves like the standard Drizzle db instance.
 * When called within withTransaction(), all operations automatically use
 * the transaction, enabling test isolation without changing service code.
 *
 * The Proxy intercepts property access and redirects to the transaction
 * when one is active in the current async context.
 */
export const db = new Proxy(realDb, {
	get(target, prop) {
		const tx = txStorage.getStore();

		// Flatten nested transactions (use outer tx instead of creating savepoint)
		// When a service calls db.transaction() while already in a transaction context,
		// we just call the callback with the existing transaction instead of nesting.
		if (prop === 'transaction') {
			if (tx) {
				return async (fn: (tx: typeof realDb) => Promise<unknown>) => fn(tx);
			}
			return target.transaction.bind(target);
		}

		const source = tx ?? target;
		const value = source[prop as keyof typeof source];
		return typeof value === 'function' ? value.bind(source) : value;
	}
});

/**
 * Run code within a transaction context.
 * All db operations inside the callback will use the transaction.
 *
 * Used by withTestTransaction to enable automatic rollback in tests.
 * Can also be used in production for explicit transaction control.
 *
 * @example
 * await withTransaction(async (tx) => {
 *   // All db calls here use the transaction, even through service singletons
 *   await someService.doSomething();
 *   await anotherService.doSomethingElse();
 * });
 */
export function withTransaction<T>(
	fn: (tx: typeof realDb) => Promise<T>
): Promise<T> {
	return realDb.transaction((tx) =>
		// Cast through unknown because PgTransaction is missing $client property
		// that exists on PostgresJsDatabase, but has all the query methods we need
		txStorage.run(tx as unknown as typeof realDb, () =>
			fn(tx as unknown as typeof realDb)
		)
	);
}

/**
 * Database type for use in function signatures.
 * This is the concrete type of the db instance.
 */
export type Database = typeof realDb;
