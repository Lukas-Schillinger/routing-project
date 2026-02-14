import { env } from '$env/dynamic/public';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { requirePermission } from '$lib/services/server/permissions';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const user = requirePermission('billing:update');

	const setupIntentParam = url.searchParams.get('setup_intent');
	const redirectStatus = url.searchParams.get('redirect_status');

	// Return flow: Stripe redirected back with setup_intent + redirect_status
	if (setupIntentParam && redirectStatus === 'succeeded') {
		await subscriptionService.completeUpgrade(
			user.organization_id,
			setupIntentParam
		);
		throw redirect(302, '/auth/account?upgraded=true');
	}

	// Initial load: create Setup Intent for the Payment Element
	const { clientSecret } = await subscriptionService.createUpgradeSetupIntent(
		user.organization_id
	);

	return {
		clientSecret,
		stripePublicKey: env.PUBLIC_STRIPE_KEY
	};
};
