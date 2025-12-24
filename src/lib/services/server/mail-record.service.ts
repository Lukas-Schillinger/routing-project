import {
	type CreateMailRecord,
	type MailRecord,
	type ResendWebhookData,
	type ResendWebhookEventType,
	type ResendWebhookPayload
} from '$lib/schemas/mail-record.js';
import { db } from '$lib/server/db';
import { mailRecords } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export class MailRecordService {
	/**
	 * Create a new mail record when an email is sent
	 */
	async createMailRecord(data: CreateMailRecord): Promise<MailRecord> {
		const [mailRecord] = await db
			.insert(mailRecords)
			.values({
				organization_id: data.organization_id,
				resend_id: data.resend_id,
				type: data.type,
				to_email: data.to_email,
				from_email: data.from_email,
				subject: data.subject || null,
				status: 'sent'
			})
			.returning();

		return mailRecord;
	}

	/**
	 * Get mail record by Resend ID (for webhook processing)
	 */
	async getMailRecordByResendId(resendId: string): Promise<MailRecord | null> {
		const [mailRecord] = await db
			.select()
			.from(mailRecords)
			.where(eq(mailRecords.resend_id, resendId))
			.limit(1);

		return mailRecord || null;
	}

	/**
	 * Process a webhook event from Resend
	 */
	async processWebhookEvent(payload: ResendWebhookPayload): Promise<void> {
		const { type, data, created_at } = payload;
		const eventTimestamp = new Date(created_at);

		// Find the mail record by Resend ID
		const mailRecord = await this.getMailRecordByResendId(data.email_id);

		if (!mailRecord) {
			// Email not in our system - could be from before tracking was implemented
			console.warn(`Webhook received for unknown email: ${data.email_id}`);
			return;
		}

		// Update mail record status based on event type
		await this.updateMailRecordStatus(mailRecord.id, type, eventTimestamp, data);
	}

	/**
	 * Update mail record status and timestamps based on event
	 */
	private async updateMailRecordStatus(
		mailRecordId: string,
		eventType: ResendWebhookEventType,
		eventTimestamp: Date,
		data: ResendWebhookData
	): Promise<void> {
		const updates: Partial<{
			status: 'sent' | 'delivered' | 'bounced' | 'complained' | 'delivery_delayed' | 'failed';
			delivered_at: Date;
			bounced_at: Date;
			error: string;
		}> = {};

		switch (eventType) {
			case 'email.delivered':
				updates.status = 'delivered';
				updates.delivered_at = eventTimestamp;
				break;
			case 'email.bounced':
				updates.status = 'bounced';
				updates.bounced_at = eventTimestamp;
				break;
			case 'email.complained':
				updates.status = 'complained';
				break;
			case 'email.delivery_delayed':
				updates.status = 'delivery_delayed';
				break;
			case 'email.failed':
				updates.status = 'failed';
				if (data.failed) {
					updates.error = data.failed.reason;
				} else {
					updates.error = 'No reason given for failure';
				}
				break;
			case 'email.sent':
				// Already set to 'sent' on creation, no update needed
				return;
		}

		if (Object.keys(updates).length > 0) {
			await db.update(mailRecords).set(updates).where(eq(mailRecords.id, mailRecordId));
		}
	}
}

// Singleton instance
export const mailRecordService = new MailRecordService();
