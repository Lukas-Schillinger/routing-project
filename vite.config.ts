import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	return {
		plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
		server: {
			allowedHosts: env.CF_TUNNEL_URL ? [env.CF_TUNNEL_URL] : []
		},
		test: {
			expect: { requireAssertions: true },
			includeTaskLocation: true,
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
						includeTaskLocation: true,
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**'],
						setupFiles: ['./vitest-setup-client.ts']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						includeTaskLocation: true,
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						coverage: {
							provider: 'v8',
							include: ['src/lib/services/server/**/*.ts'],
							exclude: [
								'**/*.test.ts',
								'**/*.spec.ts',
								'**/index.ts',
								'**/errors.ts'
							],
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
				}
			]
		}
	};
});
