import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
	const envelope = await request.text();
	const header = JSON.parse(envelope.split('\n')[0]);
	const dsn = new URL(header.dsn);

	if (!dsn.hostname.endsWith('sentry.io')) {
		return new Response('Invalid host', { status: 400 });
	}

	const projectId = dsn.pathname.slice(1);
	return fetch(`https://${dsn.hostname}/api/${projectId}/envelope/`, {
		method: 'POST',
		body: envelope,
		headers: { 'Content-Type': 'application/x-sentry-envelope' }
	});
};
