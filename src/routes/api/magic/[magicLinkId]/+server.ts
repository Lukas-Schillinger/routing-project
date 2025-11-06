import { magicLinkService } from '$lib/services/server/magic-link.service';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) {
		error(400, 'Unauthorized');
	}

	magicLinkService.deleteMagicLink(params.magicLinkId, user.organization_id);
	return json('success');
};
