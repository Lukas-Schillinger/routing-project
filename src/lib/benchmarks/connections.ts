/**
 * Database connections for benchmarking
 *
 * Two connection modes:
 * - Direct: connects directly to Supabase Postgres (port 5432)
 * - Pooler: connects via Supavisor connection pooler (port 6543)
 *
 * Required env vars:
 * - BENCH_DATABASE_URL: Direct Supabase connection (port 5432)
 * - BENCH_DATABASE_POOLER_URL: Supavisor pooler connection (port 6543)
 * - BENCH_MAP_ID: Map ID to benchmark against
 * - BENCH_ORG_ID: Organization ID for the map
 */
import * as schema from '$lib/server/db/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const DIRECT_URL = process.env.BENCH_DATABASE_URL;
const POOLER_URL = process.env.BENCH_DATABASE_POOLER_URL;
export const BENCHMARK_MAP_ID = process.env.BENCH_MAP_ID!;
export const BENCHMARK_ORG_ID = process.env.BENCH_ORG_ID!;

if (!DIRECT_URL || !POOLER_URL || !BENCHMARK_MAP_ID || !BENCHMARK_ORG_ID) {
	throw new Error(
		'Missing benchmark env vars. Set BENCH_DATABASE_URL, BENCH_DATABASE_POOLER_URL, BENCH_MAP_ID, BENCH_ORG_ID'
	);
}

const directClient = postgres(DIRECT_URL);
const poolerClient = postgres(POOLER_URL);

export const directDb = drizzle(directClient, { schema });
export const poolerDb = drizzle(poolerClient, { schema });

export type BenchDb = typeof directDb;

/**
 * Clean up connections after benchmarks
 */
export async function closeConnections() {
	await directClient.end();
	await poolerClient.end();
}
