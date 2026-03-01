// POST /api/webhooks/stripe - Handle Stripe webhook events

import { env } from '$env/dynamic/private';
import { handleWebhookError } from '$lib/errors';
import { stripeClient } from '$lib/services/external/stripe/client';
import { billingService } from '$lib/services/server/billing.service';
import { subscriptionService } from '$lib/services/server/subscription.service';
import * as Sentry from '@sentry/sveltekit';
import { json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const log = locals.log;

	// Phase 1: Verify signature — return non-2xx on failure
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
	if (!webhookSecret) {
		Sentry.captureException(new Error('STRIPE_WEBHOOK_SECRET not configured'));
		return json({ error: 'Webhook not configured' }, { status: 500 });
	}

	const signature = request.headers.get('stripe-signature');
	if (!signature) {
		return json({ error: 'Missing signature' }, { status: 401 });
	}

	const rawBody = await request.text();

	let event: Stripe.Event;
	try {
		event = stripeClient.constructWebhookEvent(
			rawBody,
			signature,
			webhookSecret
		);
	} catch (err) {
		log.warn({ err }, 'Stripe webhook signature verification failed');
		return json({ error: 'Invalid signature' }, { status: 401 });
	}

	// Phase 2: Process event — always return 200
	log.info(
		{ eventType: event.type, eventId: event.id },
		'Stripe webhook received'
	);

	try {
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as Stripe.Checkout.Session;
				if (session.metadata?.checkout_type === 'credits') {
					const creditAmount = parseInt(
						session.metadata?.credit_amount ?? '0',
						10
					);
					const paymentIntentId = session.payment_intent as string;
					const organizationId = session.metadata?.organization_id;

					if (creditAmount > 0 && paymentIntentId && organizationId) {
						await billingService.grantPurchasedCredits(
							organizationId,
							creditAmount,
							paymentIntentId,
							`Purchased ${creditAmount} credits`
						);
						log.info(
							{ organizationId, creditAmount },
							'Credits granted from purchase'
						);
					}
				}
				break;
			}

			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				const subscription = event.data.object as Stripe.Subscription;
				const organizationId = subscription.metadata.organization_id;

				if (!organizationId) {
					log.info(
						{ subscriptionId: subscription.id },
						'Skipping sync - subscription missing organization_id'
					);
					break;
				}

				await subscriptionService.syncSubscription(subscription);
				log.info(
					{ organizationId, status: subscription.status },
					'Subscription synced'
				);
				break;
			}

			case 'customer.subscription.deleted': {
				const subscription = event.data.object as Stripe.Subscription;
				const organizationId = subscription.metadata.organization_id;

				if (organizationId) {
					await subscriptionService.clearSubscription(organizationId);
					log.info(
						{ organizationId },
						'Subscription deleted - org reverted to Free'
					);
				}
				break;
			}

			default:
				log.info({ eventType: event.type }, 'Unhandled Stripe event');
		}
	} catch (error) {
		log.error(
			{ err: error, eventType: event.type, eventId: event.id },
			'Stripe webhook processing failed'
		);
		// Report to Sentry if unexpected (return value intentionally discarded — always return 200)
		handleWebhookError(error, 'stripe', {
			eventType: event.type,
			eventId: event.id
		});
	}

	return json({ received: true });
};
