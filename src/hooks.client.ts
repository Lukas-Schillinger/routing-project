import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';
import type { HandleClientError } from '@sveltejs/kit';

Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	tunnel: '/api/sentry-tunnel',
	environment: import.meta.env.MODE,
	tracesSampleRate: 1.0,
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
	integrations: [Sentry.replayIntegration()]
});

const errorHandler: HandleClientError = ({ error, event }) => {
	console.error('Client error:', error, event);
};

export const handleError = Sentry.handleErrorWithSentry(errorHandler);
