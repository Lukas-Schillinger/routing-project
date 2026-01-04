import { ServiceError } from '$lib/errors';
import { deleteSessionTokenCookie, invalidateSession } from '$lib/services/server/auth';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	if (!event.locals.session) {
		throw ServiceError.unauthorized('Unauthorized');
	}

	await invalidateSession(event.locals.session.id);
	deleteSessionTokenCookie(event);

	return json({ success: true });
};
