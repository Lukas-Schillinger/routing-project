import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { getEnvDir } from './src/lib/env-dir.ts';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		adapter: adapter(),
		env: {
			dir: getEnvDir()
		},
		experimental: {
			instrumentation: { server: true },
			tracing: { server: true }
		}
	},
	extensions: ['.svelte', '.svx']
};

export default config;
