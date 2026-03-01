import { env } from '$env/dynamic/private';
import { handleWebhookError, ServiceError } from '$lib/errors';
import { resendWebhookPayloadSchema } from '$lib/schemas/mail-record';
import { mailRecordService } from '$lib/services/server/mail-record.service';
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';
import type { RequestHandler } from './$types';

const resend = new Resend(env.RESEND_API_KEY);

export const POST: RequestHandler = async ({ request, locals }) => {
	const log = locals.log;
	let emailId: string | undefined;

	try {
		// Get raw body for signature verification
		const payload = await request.text();

		// Get Svix headers for verification
		const id = request.headers.get('svix-id');
		const timeStamp = request.headers.get('svix-timestamp');
		const signature = request.headers.get('svix-signature');

		if (!id || !timeStamp || !signature) {
			throw ServiceError.badRequest('Missing webhook headers');
		}

		// Verify webhook signature
		const webhookSecret = env.RESEND_WEBHOOK_SECRET;
		if (!webhookSecret) {
			throw ServiceError.internal('RESEND_WEBHOOK_SECRET not configured');
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
			throw ServiceError.unauthorized('Invalid webhook signature', {
				cause: err
			});
		}

		// Parse and validate payload
		const validatedPayload = resendWebhookPayloadSchema.parse(verifiedPayload);
		emailId = validatedPayload.data.email_id;

		log.info(
			{ emailId, eventType: validatedPayload.type },
			'Mail webhook received'
		);

		// Process the webhook event
		await mailRecordService.processWebhookEvent(validatedPayload);

		log.info(
			{ emailId, eventType: validatedPayload.type },
			'Mail webhook processed'
		);
		return json({ success: true });
	} catch (error) {
		log.error({ error, emailId }, 'Mail webhook error');
		const { body, status } = handleWebhookError(error, 'mail', { emailId });
		return json(body, { status });
	}
};
