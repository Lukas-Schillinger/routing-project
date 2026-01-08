import { env } from '$env/dynamic/private';
import { resendWebhookPayloadSchema } from '$lib/schemas/mail-record.js';
import { mailRecordService } from '$lib/services/server/mail-record.service.js';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import { z } from 'zod';
import type { RequestHandler } from './$types';

const resend = new Resend(env.RESEND_API_KEY);

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Get raw body for signature verification
		const payload = await request.text();

		// Get Svix headers for verification
		const id = request.headers.get('svix-id');
		const timeStamp = request.headers.get('svix-timestamp');
		const signature = request.headers.get('svix-signature');

		if (!id || !timeStamp || !signature) {
			console.warn('Missing Svix headers in webhook request');
			return json(
				{ success: false, error: 'Missing webhook headers' },
				{ status: 400 }
			);
		}

		// Verify webhook signature
		const webhookSecret = env.RESEND_WEBHOOK_SECRET;
		if (!webhookSecret) {
			console.error('RESEND_WEBHOOK_SECRET not configured');
			return json(
				{ success: false, error: 'Server configuration error' },
				{ status: 500 }
			);
		}

		let verifiedPayload: unknown;

		try {
			verifiedPayload = resend.webhooks.verify({
				payload,
				headers: {
					id,
					timestamp: timeStamp,
					signature
				},
				webhookSecret
			});
		} catch (err) {
			console.warn('Webhook signature verification failed:', err);
			return json(
				{ success: false, error: 'Invalid signature' },
				{ status: 401 }
			);
		}

		// Parse and validate payload
		const validatedPayload = resendWebhookPayloadSchema.parse(verifiedPayload);

		// Process the webhook event
		await mailRecordService.processWebhookEvent(validatedPayload);

		return json({ success: true });
	} catch (error) {
		console.error('Mail webhook error:', error);

		if (error instanceof z.ZodError) {
			return json(
				{
					success: false,
					error: 'Invalid payload',
					details: error.errors
				},
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
