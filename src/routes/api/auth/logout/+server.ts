import { deleteSessionTokenCookie, invalidateSession } from '$lib/services/server/auth';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.session) {
		error(401, 'Unauthorized');
	}

	await invalidateSession(event.locals.session.id);
	deleteSessionTokenCookie(event);

	return json({ success: true });
};
