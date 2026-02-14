// POST /api/webhooks/stripe - Handle Stripe webhook events

import { env } from '$env/dynamic/private';
import { PlanSlug } from '$lib/config/billing';
import { handleWebhookError, ServiceError } from '$lib/errors';
import { stripeClient } from '$lib/services/external/stripe/client';
import { billingService } from '$lib/services/server/billing.service';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import type { RequestHandler } from './$types';

type Logger = typeof import('$lib/server/logger').logger;

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

		await handleStripeEvent(event, log);

		return json({ received: true });
	} catch (error) {
		const { body, status } = handleWebhookError(error, 'stripe');
		return json(body, { status });
	}
};

// ============================================================================
// Event Router
// ============================================================================

async function handleStripeEvent(event: Stripe.Event, log: Logger) {
	// Subscription events
	if (event.type.startsWith('customer.subscription.')) {
		await handleSubscriptionEvent(
			event.type,
			event.data.object as Stripe.Subscription,
			log
		);
		return;
	}

	// Invoice events
	if (event.type.startsWith('invoice.')) {
		await handleInvoiceEvent(
			event.type,
			event.data.object as Stripe.Invoice,
			log
		);
		return;
	}

	// Checkout events
	if (event.type === 'checkout.session.completed') {
		await handleCheckoutCompleted(
			event.data.object as Stripe.Checkout.Session,
			log
		);
		return;
	}

	log.info(
		{ eventType: event.type, eventId: event.id },
		'Unhandled Stripe event type'
	);
}

// ============================================================================
// Checkout Handler
// ============================================================================

async function handleCheckoutCompleted(
	session: Stripe.Checkout.Session,
	log: Logger
) {
	const checkoutType = session.metadata?.checkout_type;
	const organizationId = session.metadata?.organization_id;

	if (!organizationId) {
		log.warn(
			{ sessionId: session.id },
			'Checkout session missing organization_id'
		);
		return;
	}

	log.info(
		{ sessionId: session.id, checkoutType, organizationId },
		'Processing checkout completion'
	);

	if (checkoutType === 'credits') {
		const creditAmount = parseInt(session.metadata?.credit_amount ?? '0', 10);
		const paymentIntentId = session.payment_intent as string;

		if (creditAmount > 0 && paymentIntentId) {
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
	} else if (checkoutType === 'upgrade') {
		const existingSubscriptionId = session.metadata?.existing_subscription_id;
		const newSubscriptionId = session.subscription as string;

		if (!existingSubscriptionId || !newSubscriptionId) {
			log.warn(
				{ sessionId: session.id, existingSubscriptionId, newSubscriptionId },
				'Upgrade checkout missing subscription IDs'
			);
			return;
		}

		await stripeClient.cancelSubscription(existingSubscriptionId);
		log.info(
			{ organizationId, oldSubscriptionId: existingSubscriptionId },
			'Cancelled old subscription during upgrade'
		);

		await stripeClient.updateSubscription(newSubscriptionId, {
			metadata: { organization_id: organizationId }
		});

		const newSubscription =
			await stripeClient.getSubscription(newSubscriptionId);
		await subscriptionService.syncSubscription(newSubscription);

		log.info(
			{ organizationId, newSubscriptionId },
			'Upgrade completed - new subscription synced'
		);
	}
}

// ============================================================================
// Subscription Event Handler
// ============================================================================

type SubscriptionEventType =
	| 'customer.subscription.created'
	| 'customer.subscription.updated'
	| 'customer.subscription.deleted'
	| 'customer.subscription.paused'
	| 'customer.subscription.resumed'
	| 'customer.subscription.trial_will_end';

const subscriptionEventConfig: Record<
	SubscriptionEventType,
	{ level: 'info' | 'warn'; message: string; sync?: boolean }
> = {
	'customer.subscription.created': {
		level: 'info',
		message: 'Subscription created',
		sync: true
	},
	'customer.subscription.updated': {
		level: 'info',
		message: 'Subscription updated',
		sync: true
	},
	'customer.subscription.deleted': {
		level: 'info',
		message: 'Subscription deleted',
		sync: false // Handled specially to auto-create Free subscription
	},
	'customer.subscription.paused': {
		level: 'warn',
		message: 'Subscription paused',
		sync: true
	},
	'customer.subscription.resumed': {
		level: 'info',
		message: 'Subscription resumed',
		sync: true
	},
	'customer.subscription.trial_will_end': {
		level: 'info',
		message: 'Subscription trial ending soon',
		sync: false
	}
};

async function handleSubscriptionEvent(
	eventType: string,
	subscription: Stripe.Subscription,
	log: Logger
) {
	const config = subscriptionEventConfig[eventType as SubscriptionEventType];
	const organizationId = subscription.metadata.organization_id;

	const context = {
		subscriptionId: subscription.id,
		organizationId,
		status: subscription.status
	};

	if (!config) {
		log.info({ eventType, ...context }, 'Unhandled subscription event type');
		return;
	}

	log[config.level](context, config.message);

	if (eventType === 'customer.subscription.deleted') {
		await handleSubscriptionDeleted(subscription, log);
		return;
	}

	if (config.sync) {
		// Skip syncing if organization_id is missing - this happens during upgrades
		// when customer.subscription.created fires before checkout.session.completed
		// adds the metadata. The checkout handler will sync it properly.
		if (!organizationId) {
			log.info(
				context,
				'Skipping sync - subscription missing organization_id (will be synced by checkout handler)'
			);
			return;
		}

		await subscriptionService.syncSubscription(subscription);
	}
}

/**
 * When a subscription is deleted (cancelled), auto-create a Free subscription
 * so the org always has an active subscription.
 */
async function handleSubscriptionDeleted(
	subscription: Stripe.Subscription,
	log: Logger
) {
	const organizationId = subscription.metadata.organization_id;
	const customerId =
		typeof subscription.customer === 'string'
			? subscription.customer
			: subscription.customer?.id;

	if (!organizationId || !customerId) {
		log.warn(
			{
				subscriptionId: subscription.id,
				organizationId,
				customerId
			},
			'Subscription deleted but missing organization_id or customer_id - cannot auto-create Free subscription'
		);
		return;
	}

	const plan =
		await subscriptionService.getPlanFromStripeSubscription(subscription);
	if (plan?.name === PlanSlug.FREE) {
		log.info(
			{ organizationId },
			'Free subscription deleted - not creating another'
		);
		return;
	}

	const freePlan = await subscriptionService.getPlanBySlug(PlanSlug.FREE);
	if (!freePlan) {
		log.error(
			{ organizationId },
			'Cannot auto-create Free subscription - Free plan not found'
		);
		return;
	}

	const newSubscription = await stripeClient.createSubscription({
		customerId,
		priceId: freePlan.stripe_price_id,
		organizationId
	});

	await subscriptionService.syncSubscription(newSubscription);

	log.info(
		{
			organizationId,
			newSubscriptionId: newSubscription.id
		},
		'Auto-created Free subscription after Pro cancellation'
	);
}

// ============================================================================
// Invoice Event Handler
// ============================================================================

type InvoiceEventType =
	| 'invoice.created'
	| 'invoice.finalized'
	| 'invoice.finalization_failed'
	| 'invoice.paid'
	| 'invoice.payment_failed'
	| 'invoice.payment_action_required'
	| 'invoice.upcoming'
	| 'invoice.marked_uncollectible'
	| 'invoice.voided';

type InvoiceAction = 'sync_subscription' | 'none';

const invoiceEventConfig: Record<
	InvoiceEventType,
	{ level: 'info' | 'warn' | 'error'; message: string; action: InvoiceAction }
> = {
	'invoice.created': {
		level: 'info',
		message: 'Invoice created',
		action: 'none'
	},
	'invoice.finalized': {
		level: 'info',
		message: 'Invoice finalized',
		action: 'none'
	},
	'invoice.finalization_failed': {
		level: 'error',
		message: 'Invoice finalization failed',
		action: 'none'
	},
	'invoice.paid': {
		level: 'info',
		message: 'Invoice paid',
		action: 'none'
	},
	'invoice.payment_failed': {
		level: 'warn',
		message: 'Invoice payment failed',
		action: 'sync_subscription'
	},
	'invoice.payment_action_required': {
		level: 'warn',
		message: 'Invoice payment requires customer action',
		action: 'none'
	},
	'invoice.upcoming': {
		level: 'info',
		message: 'Upcoming invoice for subscription renewal',
		action: 'none'
	},
	'invoice.marked_uncollectible': {
		level: 'error',
		message: 'Invoice marked as uncollectible',
		action: 'sync_subscription'
	},
	'invoice.voided': {
		level: 'info',
		message: 'Invoice voided',
		action: 'none'
	}
};

function getInvoiceContext(invoice: Stripe.Invoice) {
	const subscriptionRef = invoice.parent?.subscription_details?.subscription;
	return {
		invoiceId: invoice.id,
		invoiceNumber: invoice.number,
		customerId:
			typeof invoice.customer === 'string'
				? invoice.customer
				: invoice.customer?.id,
		subscriptionId:
			typeof subscriptionRef === 'string'
				? subscriptionRef
				: subscriptionRef?.id,
		amountDue: invoice.amount_due,
		amountPaid: invoice.amount_paid,
		currency: invoice.currency,
		status: invoice.status,
		billingReason: invoice.billing_reason
	};
}

async function handleInvoiceEvent(
	eventType: string,
	invoice: Stripe.Invoice,
	log: Logger
) {
	const config = invoiceEventConfig[eventType as InvoiceEventType];
	const context = getInvoiceContext(invoice);

	if (!config) {
		log.info({ eventType, ...context }, 'Unhandled invoice event type');
		return;
	}

	switch (config.action) {
		case 'sync_subscription':
			await syncSubscriptionFromInvoice(invoice, context, config, log);
			break;

		case 'none':
		default:
			log[config.level](context, config.message);
	}
}

async function syncSubscriptionFromInvoice(
	invoice: Stripe.Invoice,
	context: ReturnType<typeof getInvoiceContext>,
	config: (typeof invoiceEventConfig)[InvoiceEventType],
	log: Logger
) {
	const subscriptionRef = invoice.parent?.subscription_details?.subscription;

	if (!subscriptionRef) {
		log[config.level](context, `${config.message} (non-subscription invoice)`);
		return;
	}

	const subscription = await stripeClient.getSubscription(
		typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id
	);

	log[config.level](
		{
			...context,
			organizationId: subscription.metadata.organization_id,
			subscriptionStatus: subscription.status,
			attemptCount: invoice.attempt_count,
			nextPaymentAttempt: invoice.next_payment_attempt
				? new Date(invoice.next_payment_attempt * 1000).toISOString()
				: null
		},
		config.message
	);

	await subscriptionService.syncSubscription(subscription);
}
