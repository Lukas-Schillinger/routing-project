import { handleApiError } from '$lib/errors';
import { requireAdminApi } from '$lib/services/server/admin';
import {
	invalidateSession,
	sessionCookieName,
	setSessionTokenCookie,
	validateSessionToken
} from '$lib/services/server/auth';
import { logger } from '$lib/server/logger';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const log = logger.child({ service: 'admin-impersonate' });

const IMPERSONATION_COOKIE_NAME = 'admin-original-session';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	requireAdminApi();

	try {
		// Get the admin's original session token
		const adminSessionToken = cookies.get(IMPERSONATION_COOKIE_NAME);
		if (!adminSessionToken) {
			return json(
				{ success: false, error: 'No impersonation session found' },
				{ status: 400 }
			);
		}

		// Validate the admin's original session is still valid
		const { session: adminSession, user: adminUser } =
			await validateSessionToken(adminSessionToken);
		if (!adminSession || !adminUser) {
			// Clear the invalid cookie
			cookies.delete(IMPERSONATION_COOKIE_NAME, { path: '/' });
			return json(
				{ success: false, error: 'Admin session expired' },
				{ status: 401 }
			);
		}

		// Get and invalidate the current impersonated session
		const impersonatedSessionToken = cookies.get(sessionCookieName);
		if (impersonatedSessionToken && locals.session) {
			await invalidateSession(locals.session.id);
		}

		// Restore admin session cookie
		setSessionTokenCookie(
			{ cookies } as Parameters<typeof setSessionTokenCookie>[0],
			adminSessionToken,
			adminSession.expires_at
		);

		// Delete the impersonation cookie
		cookies.delete(IMPERSONATION_COOKIE_NAME, { path: '/' });

		log.info(
			{
				adminUserId: adminUser.id,
				impersonatedUserId: locals.user?.id
			},
			'Admin ended impersonation'
		);

		return json({
			success: true,
			redirectUrl: '/admin/organizations'
		});
	} catch (err) {
		handleApiError(err, 'Failed to stop impersonation');
	}
};
