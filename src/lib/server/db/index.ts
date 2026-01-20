import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, { schema });

/**
 * =============================================================================
 * FUTURE: Test Isolation via AsyncLocalStorage + Proxy
 * =============================================================================
 *
 * Currently, services import `db` directly as a singleton. This means
 * `withTestTransaction` in tests can't make services participate in the test
 * transaction - they use the global `db` on a different connection.
 *
 * Current test approach: manual cleanup with ID tracking in afterAll().
 *
 * A cleaner approach uses Node's AsyncLocalStorage to make `db` context-aware:
 *
 * ```typescript
 * import { AsyncLocalStorage } from 'async_hooks';
 *
 * const client = postgres(env.DATABASE_URL);
 * const realDb = drizzle(client, { schema });
 *
 * // Stores the current transaction for the async context
 * const txStorage = new AsyncLocalStorage<typeof realDb>();
 *
 * // Proxy intercepts all db access and checks for transaction context
 * export const db = new Proxy(realDb, {
 *   get(target, prop) {
 *     const tx = txStorage.getStore();
 *
 *     // Flatten nested transactions (use outer tx instead of creating savepoint)
 *     if (prop === 'transaction') {
 *       if (tx) {
 *         return async (fn: (tx: typeof realDb) => Promise<unknown>) => fn(tx);
 *       }
 *       return target.transaction.bind(target);
 *     }
 *
 *     const source = tx ?? target;
 *     const value = source[prop as keyof typeof source];
 *     return typeof value === 'function' ? value.bind(source) : value;
 *   }
 * });
 *
 * // Run code within a transaction context
 * export function withTransaction<T>(
 *   fn: (tx: typeof realDb) => Promise<T>
 * ): Promise<T> {
 *   return realDb.transaction((tx) =>
 *     txStorage.run(tx as typeof realDb, () => fn(tx as typeof realDb))
 *   );
 * }
 * ```
 *
 * Then withTestTransaction becomes:
 *
 * ```typescript
 * export async function withTestTransaction<T>(fn: () => Promise<T>): Promise<T> {
 *   let result: T;
 *   try {
 *     await withTransaction(async () => {
 *       result = await fn();  // No tx param needed!
 *       throw new RollbackError();
 *     });
 *   } catch (e) {
 *     if (e instanceof RollbackError) return result!;
 *     throw e;
 *   }
 *   return result!;
 * }
 * ```
 *
 * Benefits:
 * - Services need zero changes - they keep using `db` directly
 * - All code in withTestTransaction automatically uses the test transaction
 * - Service methods that call db.transaction() internally just use the outer tx
 * - Complete test isolation with automatic rollback
 *
 * Tradeoff:
 * - "Flattening" nested transactions means savepoint behavior isn't tested
 * - If a service relies on partial rollback via savepoints, tests won't catch it
 * - Most services don't need this, so it's usually fine
 *
 * Performance: Negligible. Proxy/AsyncLocalStorage overhead is nanoseconds;
 * DB queries are milliseconds. Used in production by Prisma, Next.js, etc.
 */
