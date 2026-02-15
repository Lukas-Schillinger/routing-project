// POST /api/webhooks/stripe - Handle Stripe webhook events

import { env } from '$env/dynamic/private';
import { handleWebhookError, ServiceError } from '$lib/errors';
import { stripeClient } from '$lib/services/external/stripe/client';
import { billingService } from '$lib/services/server/billing.service';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const log = locals.log;

	try {
		const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
		if (!webhookSecret) {
			throw ServiceError.internal('STRIPE_WEBHOOK_SECRET not configured');
		}

		const signature = request.headers.get('stripe-signature');
		if (!signature) {
			throw ServiceError.unauthorized('Missing Stripe signature');
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
			throw ServiceError.unauthorized('Invalid Stripe signature');
		}

		log.info(
			{ eventType: event.type, eventId: event.id },
			'Stripe webhook received'
		);

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

		return json({ received: true });
	} catch (error) {
		log.error({ err: error }, 'Stripe webhook handler error');
		const { body, status } = handleWebhookError(error, 'stripe');
		return json(body, { status });
	}
};
