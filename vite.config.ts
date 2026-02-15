import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	return {
		plugins: [
			sentrySvelteKit({
				sourceMapsUploadOptions: {
					org: env.SENTRY_ORG,
					project: env.SENTRY_PROJECT,
					authToken: env.SENTRY_AUTH_TOKEN
				}
			}),
			tailwindcss(),
			sveltekit(),
			devtoolsJson()
		],
		server: {
			allowedHosts: env.CF_TUNNEL_URL ? [env.CF_TUNNEL_URL] : []
		},
		test: {
			expect: { requireAssertions: true },
			includeTaskLocation: true,
			pool: 'forks',
			poolOptions: {
				// Included because tests we're filling up all available RAM
				forks: {
					maxForks: 8,
					minForks: 1
				}
			},
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						environment: 'browser',
						browser: {
							enabled: true,
							headless: true,
							provider: 'playwright',
							instances: [{ browser: 'chromium' }]
						},
						fileParallelism: false, // Limit to one chrome instance at a time
						includeTaskLocation: true,
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**', 'src/lib/benchmarks/**'],
						setupFiles: ['./vitest-setup-client.ts']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						includeTaskLocation: true,
						testTimeout: 15000,
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: [
							'src/**/*.svelte.{test,spec}.{js,ts}',
							'src/lib/benchmarks/**',
							'src/lib/services/external/**/*.test.{js,ts}'
						],
						coverage: {
							provider: 'v8',
							include: ['src/lib/services/server/**/*.ts'],
							exclude: ['**/*.test.ts', '**/index.ts', '**/errors.ts'],
							thresholds: {
								statements: 70,
								branches: 70,
								functions: 70,
								lines: 70
							},
							reporter: ['text', 'html', 'json-summary'],
							reportsDirectory: './coverage'
						}
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						// External services like mail, R2, and mapbox.
						name: 'external',
						environment: 'node',
						includeTaskLocation: true,
						testTimeout: 120_000,
						include: ['src/lib/services/external/**/*.test.{js,ts}'],
						exclude: []
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'bench',
						environment: 'node',
						include: [],
						benchmark: {
							include: ['src/lib/benchmarks/**/*.bench.ts']
						}
					}
				}
			]
		}
	};
});
