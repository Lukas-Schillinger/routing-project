import { handleApiError } from '$lib/errors';
import { adminService } from '$lib/services/server/admin.service';
import { requireAdminApi } from '$lib/services/server/admin';
import {
	sessionCookieName,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const impersonateSchema = z.object({
	userId: z.string().uuid()
});

const IMPERSONATION_COOKIE_NAME = 'admin-original-session';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const admin = requireAdminApi();

	try {
		const body = await request.json();
		const data = impersonateSchema.parse(body);

		// Get admin's current session token to store
		const adminSessionToken = cookies.get(sessionCookieName);
		if (!adminSessionToken) {
			return json(
				{ success: false, error: 'No active session' },
				{ status: 401 }
			);
		}

		// Create impersonation session for target user
		const { sessionToken, expiresAt } =
			await adminService.createImpersonationSession(data.userId, admin.id);

		// Store admin's original session token in a separate cookie
		cookies.set(IMPERSONATION_COOKIE_NAME, adminSessionToken, {
			path: '/',
			httpOnly: true,
			secure: !import.meta.env.DEV,
			sameSite: 'lax',
			expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
		});

		// Set the new session cookie for the impersonated user
		setSessionTokenCookie(
			{ cookies } as Parameters<typeof setSessionTokenCookie>[0],
			sessionToken,
			expiresAt
		);

		locals.log.info(
			{ targetUserId: data.userId },
			'Admin started impersonation'
		);

		return json({
			success: true,
			redirectUrl: '/maps'
		});
	} catch (err) {
		handleApiError(err, 'Failed to start impersonation');
	}
};
