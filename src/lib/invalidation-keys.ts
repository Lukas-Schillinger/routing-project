/**
 * SvelteKit invalidation keys for targeted data refreshing.
 *
 * Use with `depends()` in load functions and `invalidate()` in client code.
 * Prevents layout loads from re-running on data mutations.
 */
export const INVALIDATION_KEYS = {
	MAP_DATA: 'app:map-data',
	MAPS: 'app:maps',
	ACCOUNT: 'app:account',
	ROUTES: 'app:routes',
	ADMIN: 'app:admin',
	DEMO: 'app:demo'
} as const;
