// POST /api/webhooks/stripe - Handle Stripe webhook events

import { env } from '$env/dynamic/private';
import { handleWebhookError, ServiceError } from '$lib/errors';
import { billingService } from '$lib/services/server/billing.service';
import { subscriptionService } from '$lib/services/server/subscription.service';
import { stripeClient } from '$lib/services/external/stripe/client';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';

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

		// Get raw body for signature verification
		const rawBody = await request.text();

		// Verify and construct event
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
		log.info({ organizationId }, 'Subscription upgrade checkout completed');
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
		sync: true
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

	const context = {
		subscriptionId: subscription.id,
		organizationId: subscription.metadata.organization_id,
		status: subscription.status,
		schedule: subscription.schedule
	};

	if (!config) {
		log.info({ eventType, ...context }, 'Unhandled subscription event type');
		return;
	}

	log[config.level](context, config.message);

	if (config.sync) {
		await subscriptionService.syncSubscription(subscription);

		// Clear scheduled change tracking when schedule completes
		if (
			eventType === 'customer.subscription.updated' &&
			!subscription.schedule &&
			subscription.metadata.organization_id
		) {
			await subscriptionService.clearScheduledChange(
				subscription.metadata.organization_id
			);
			log.info(
				{ organizationId: subscription.metadata.organization_id },
				'Cleared scheduled change after completion'
			);
		}
	}
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

type InvoiceAction = 'grant_credits' | 'sync_subscription' | 'none';

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
		action: 'grant_credits'
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

	// Execute the action
	switch (config.action) {
		case 'grant_credits':
			await grantSubscriptionCredits(invoice, context, config, log);
			break;

		case 'sync_subscription':
			await syncSubscriptionFromInvoice(invoice, context, config, log);
			break;

		case 'none':
		default:
			log[config.level](context, config.message);
	}
}

async function grantSubscriptionCredits(
	invoice: Stripe.Invoice,
	context: ReturnType<typeof getInvoiceContext>,
	config: (typeof invoiceEventConfig)[InvoiceEventType],
	log: Logger
) {
	const subscriptionRef = invoice.parent?.subscription_details?.subscription;

	if (!subscriptionRef) {
		log.info(
			context,
			`${config.message} (non-subscription, no credits to grant)`
		);
		return;
	}

	const subscription = await stripeClient.getSubscription(
		typeof subscriptionRef === 'string' ? subscriptionRef : subscriptionRef.id
	);
	const organizationId = subscription.metadata.organization_id;

	if (!organizationId) {
		log.warn(
			{ ...context, subscriptionId: subscription.id },
			`${config.message} but subscription missing organization_id - cannot grant credits`
		);
		return;
	}

	const plan =
		await subscriptionService.getPlanFromStripeSubscription(subscription);

	if (!plan) {
		log.warn(
			{ ...context, organizationId },
			`${config.message} but plan not found - cannot grant credits`
		);
		return;
	}

	const subscriptionItem = subscription.items.data[0];
	if (!subscriptionItem) {
		log.warn(
			{ ...context, organizationId },
			`${config.message} but subscription has no items - cannot grant credits`
		);
		return;
	}

	const periodEnd = new Date(subscriptionItem.current_period_end * 1000);

	await billingService.grantSubscriptionCredits(
		organizationId,
		plan.monthly_credits,
		periodEnd,
		invoice.id,
		`Monthly ${plan.name} plan credits`
	);

	log.info(
		{
			...context,
			organizationId,
			credits: plan.monthly_credits,
			expiresAt: periodEnd.toISOString()
		},
		`${config.message} - credits granted`
	);
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
