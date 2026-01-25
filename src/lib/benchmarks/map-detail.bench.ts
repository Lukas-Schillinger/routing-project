/**
 * Benchmark: Map Detail Page Load
 *
 * Compares:
 * - Direct connection vs Supavisor pooler
 * - Current 9-query strategy vs single joined query
 *
 * Run with: npm run bench
 */
import { bench, describe, afterAll } from 'vitest';
import {
	directDb,
	poolerDb,
	closeConnections,
	BENCHMARK_MAP_ID,
	BENCHMARK_ORG_ID
} from './connections';
import { loadMapDetailCurrent } from './queries/current-strategy';
import { loadMapDetailJoined } from './queries/joined-strategy';

afterAll(async () => {
	await closeConnections();
});

describe('Map Detail Page Load', () => {
	bench(
		'direct + current queries',
		async () => {
			await loadMapDetailCurrent(directDb, BENCHMARK_MAP_ID, BENCHMARK_ORG_ID);
		},
		{ warmupIterations: 5, iterations: 50 }
	);

	bench(
		'direct + joined query',
		async () => {
			await loadMapDetailJoined(directDb, BENCHMARK_MAP_ID, BENCHMARK_ORG_ID);
		},
		{ warmupIterations: 5, iterations: 50 }
	);

	bench(
		'pooler + current queries',
		async () => {
			await loadMapDetailCurrent(poolerDb, BENCHMARK_MAP_ID, BENCHMARK_ORG_ID);
		},
		{ warmupIterations: 5, iterations: 50 }
	);

	bench(
		'pooler + joined query',
		async () => {
			await loadMapDetailJoined(poolerDb, BENCHMARK_MAP_ID, BENCHMARK_ORG_ID);
		},
		{ warmupIterations: 5, iterations: 50 }
	);
});
