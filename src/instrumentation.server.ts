import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';

Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	environment: import.meta.env.MODE,
	tracesSampleRate: 1.0
});
