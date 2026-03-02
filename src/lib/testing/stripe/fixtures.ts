/**
 * Stripe Event and Object Fixtures
 *
 * Mock Stripe objects for testing webhook handlers and services.
 */
import { randomUUID } from 'crypto';
import type Stripe from 'stripe';

// ============================================================================
// Stripe Subscription
// ============================================================================

type MockStripeSubscriptionOptions = {
	id?: string;
	customer?: string;
	status?: Stripe.Subscription.Status;
	organizationId?: string;
	priceId?: string;
	periodStart?: number;
	periodEnd?: number;
	cancelAtPeriodEnd?: boolean;
};

/**
 * Create a mock Stripe subscription object for testing.
 */
export function createMockStripeSubscription(
	options: MockStripeSubscriptionOptions = {}
): Stripe.Subscription {
	const now = Math.floor(Date.now() / 1000);
	const defaults = {
		id: `sub_mock_${Date.now()}`,
		customer: `cus_mock_${Date.now()}`,
		status: 'active' as const,
		organizationId: randomUUID(),
		priceId: 'price_mock',
		periodStart: now,
		periodEnd: now + 30 * 24 * 60 * 60,
		cancelAtPeriodEnd: false
	};
	const config = { ...defaults, ...options };

	return {
		id: config.id,
		object: 'subscription',
		customer: config.customer,
		status: config.status,
		cancel_at_period_end: config.cancelAtPeriodEnd,
		items: {
			object: 'list',
			data: [
				{
					id: `si_mock_${Date.now()}`,
					object: 'subscription_item',
					price: {
						id: config.priceId,
						object: 'price'
					} as Stripe.Price,
					current_period_start: config.periodStart,
					current_period_end: config.periodEnd
				}
			],
			has_more: false,
			url: ''
		},
		metadata: { organization_id: config.organizationId }
	} as unknown as Stripe.Subscription;
}

// ============================================================================
// Stripe Invoice
// ============================================================================

type MockStripeInvoiceOptions = {
	id?: string;
	customerId?: string;
	subscriptionId?: string;
	organizationId?: string;
	status?: Stripe.Invoice.Status;
	amountDue?: number;
	amountPaid?: number;
	billingReason?: Stripe.Invoice.BillingReason;
	hostedInvoiceUrl?: string;
	customerEmail?: string;
};

/**
 * Create a mock Stripe invoice object for testing.
 */
export function createMockStripeInvoice(
	options: MockStripeInvoiceOptions = {}
): Stripe.Invoice {
	const defaults = {
		id: `in_mock_${Date.now()}`,
		customerId: `cus_mock_${Date.now()}`,
		subscriptionId: `sub_mock_${Date.now()}`,
		organizationId: randomUUID(),
		status: 'paid' as const,
		amountDue: 4900,
		amountPaid: 4900,
		billingReason: 'subscription_cycle' as const,
		hostedInvoiceUrl: 'https://invoice.stripe.com/i/mock',
		customerEmail: 'customer@example.com'
	};
	const config = { ...defaults, ...options };

	return {
		id: config.id,
		object: 'invoice',
		customer: config.customerId,
		customer_email: config.customerEmail,
		status: config.status,
		amount_due: config.amountDue,
		amount_paid: config.amountPaid,
		currency: 'usd',
		billing_reason: config.billingReason,
		hosted_invoice_url: config.hostedInvoiceUrl,
		parent: {
			subscription_details: {
				subscription: config.subscriptionId,
				metadata: { organization_id: config.organizationId }
			}
		}
	} as unknown as Stripe.Invoice;
}

// ============================================================================
// Stripe Checkout Session
// ============================================================================

type MockCheckoutSessionOptions = {
	id?: string;
	organizationId: string;
	checkoutType: 'upgrade' | 'credits';
	creditAmount?: number;
	paymentIntentId?: string;
	mode?: 'payment' | 'subscription';
};

/**
 * Create a mock Stripe checkout session object for testing.
 */
export function createMockStripeCheckoutSession(
	options: MockCheckoutSessionOptions
): Stripe.Checkout.Session {
	return {
		id: options.id ?? `cs_mock_${Date.now()}`,
		object: 'checkout.session',
		mode:
			options.mode ??
			(options.checkoutType === 'credits' ? 'payment' : 'subscription'),
		payment_intent: options.paymentIntentId ?? `pi_mock_${Date.now()}`,
		metadata: {
			organization_id: options.organizationId,
			checkout_type: options.checkoutType,
			...(options.creditAmount !== undefined && {
				credit_amount: String(options.creditAmount)
			})
		}
	} as unknown as Stripe.Checkout.Session;
}

// ============================================================================
// Stripe Events
// ============================================================================

/**
 * Create a mock checkout.session.completed event.
 */
export function createCheckoutCompletedEvent(
	options: MockCheckoutSessionOptions
): Stripe.Event {
	const session = createMockStripeCheckoutSession(options);
	return {
		id: `evt_mock_${Date.now()}`,
		object: 'event',
		type: 'checkout.session.completed',
		data: { object: session }
	} as Stripe.Event;
}

/**
 * Create a mock invoice.paid event.
 */
export function createInvoicePaidEvent(invoice: Stripe.Invoice): Stripe.Event {
	return {
		id: `evt_mock_${Date.now()}`,
		object: 'event',
		type: 'invoice.paid',
		data: { object: invoice }
	} as Stripe.Event;
}

/**
 * Create a mock invoice.payment_failed event.
 */
export function createInvoicePaymentFailedEvent(
	invoice: Stripe.Invoice
): Stripe.Event {
	return {
		id: `evt_mock_${Date.now()}`,
		object: 'event',
		type: 'invoice.payment_failed',
		data: { object: invoice }
	} as Stripe.Event;
}

/**
 * Create a mock invoice.payment_action_required event.
 */
export function createInvoicePaymentActionRequiredEvent(
	invoice: Stripe.Invoice
): Stripe.Event {
	return {
		id: `evt_mock_${Date.now()}`,
		object: 'event',
		type: 'invoice.payment_action_required',
		data: { object: invoice }
	} as Stripe.Event;
}

/**
 * Create a mock customer.subscription.created event.
 */
export function createSubscriptionCreatedEvent(
	subscription: Stripe.Subscription
): Stripe.Event {
	return {
		id: `evt_mock_${Date.now()}`,
		object: 'event',
		type: 'customer.subscription.created',
		data: { object: subscription }
	} as Stripe.Event;
}

/**
 * Create a mock customer.subscription.updated event.
 */
export function createSubscriptionUpdatedEvent(
	subscription: Stripe.Subscription
): Stripe.Event {
	return {
		id: `evt_mock_${Date.now()}`,
		object: 'event',
		type: 'customer.subscription.updated',
		data: { object: subscription }
	} as Stripe.Event;
}

/**
 * Create a mock customer.subscription.deleted event.
 */
export function createSubscriptionDeletedEvent(
	subscription: Stripe.Subscription
): Stripe.Event {
	return {
		id: `evt_mock_${Date.now()}`,
		object: 'event',
		type: 'customer.subscription.deleted',
		data: { object: subscription }
	} as Stripe.Event;
}
