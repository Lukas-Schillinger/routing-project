import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const envelope = await request.text();
		const firstLine = envelope.split('\n')[0];

		if (!firstLine) {
			locals.log.warn('Received empty Sentry envelope');
			return new Response(null, { status: 200 });
		}

		const header = JSON.parse(firstLine);
		const dsn = new URL(header.dsn);

		if (dsn.hostname !== 'sentry.io' && !dsn.hostname.endsWith('.sentry.io')) {
			return new Response('Invalid host', { status: 400 });
		}

		const projectId = dsn.pathname.slice(1);
		const response = await fetch(
			`https://${dsn.hostname}/api/${projectId}/envelope/`,
			{
				method: 'POST',
				body: envelope,
				headers: { 'Content-Type': 'application/x-sentry-envelope' }
			}
		);

		if (!response.ok) {
			locals.log.error({ status: response.status }, 'Sentry upstream error');
		}

		return new Response(response.body, { status: response.status });
	} catch (error) {
		locals.log.error({ error }, 'Sentry tunnel error');
		return new Response('Tunnel error', { status: 400 });
	}
};
