import {
	createMailRecord,
	createOrganization,
	createTestEnvironment,
	withTestTransaction
} from '$lib/testing';
import type { ResendWebhookPayload } from '$lib/schemas/mail-record';
import { describe, expect, it } from 'vitest';
import { mailRecordService } from './mail-record.service';

/**
 * Mail Record Service Tests
 *
 * Tests mail record CRUD and Resend webhook event processing.
 * Uses withTestTransaction for automatic rollback.
 */

function makeWebhookPayload(
	type: ResendWebhookPayload['type'],
	emailId: string,
	extra?: { failed?: { reason: string } }
): ResendWebhookPayload {
	return {
		type,
		created_at: new Date().toISOString(),
		data: {
			email_id: emailId,
			from: 'noreply@example.com',
			to: ['user@example.com'],
			subject: 'Test',
			created_at: new Date().toISOString(),
			...extra
		}
	};
}

describe('MailRecordService', () => {
	describe('createMailRecord()', () => {
		it('creates a mail record with correct fields', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const result = await mailRecordService.createMailRecord({
					organization_id: organization.id,
					resend_id: 'resend-test-123',
					type: 'invitation',
					to_email: 'user@example.com',
					from_email: 'noreply@example.com',
					subject: 'You are invited'
				});

				expect(result.id).toBeDefined();
				expect(result.organization_id).toBe(organization.id);
				expect(result.resend_id).toBe('resend-test-123');
				expect(result.type).toBe('invitation');
				expect(result.to_email).toBe('user@example.com');
				expect(result.from_email).toBe('noreply@example.com');
				expect(result.subject).toBe('You are invited');
				expect(result.status).toBe('sent');
			});
		});

		it('sets subject to null when not provided', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				const result = await mailRecordService.createMailRecord({
					organization_id: organization.id,
					resend_id: 'resend-no-subject',
					type: 'login_token',
					to_email: 'user@example.com',
					from_email: 'noreply@example.com'
				});

				expect(result.subject).toBeNull();
			});
		});

		it('supports all mail record types', async () => {
			await withTestTransaction(async () => {
				const { organization } = await createTestEnvironment();

				for (const type of [
					'invitation',
					'login_token',
					'route_share',
					'password_reset'
				] as const) {
					const result = await mailRecordService.createMailRecord({
						organization_id: organization.id,
						resend_id: `resend-${type}`,
						type,
						to_email: 'user@example.com',
						from_email: 'noreply@example.com'
					});

					expect(result.type).toBe(type);
				}
			});
		});
	});

	describe('getMailRecordByResendId()', () => {
		it('returns mail record when found', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();
				const record = await createMailRecord({
					organization_id: org.id,
					resend_id: 'resend-lookup-test'
				});

				const result = await mailRecordService.getMailRecordByResendId(
					'resend-lookup-test'
				);

				expect(result).not.toBeNull();
				expect(result!.id).toBe(record.id);
				expect(result!.resend_id).toBe('resend-lookup-test');
			});
		});

		it('returns null when not found', async () => {
			await withTestTransaction(async () => {
				const result =
					await mailRecordService.getMailRecordByResendId('nonexistent-id');

				expect(result).toBeNull();
			});
		});
	});

	describe('processWebhookEvent()', () => {
		it('updates status to delivered on email.delivered', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();
				await createMailRecord({
					organization_id: org.id,
					resend_id: 'resend-delivered'
				});

				await mailRecordService.processWebhookEvent(
					makeWebhookPayload('email.delivered', 'resend-delivered')
				);

				const updated = await mailRecordService.getMailRecordByResendId(
					'resend-delivered'
				);
				expect(updated!.status).toBe('delivered');
				expect(updated!.delivered_at).toBeInstanceOf(Date);
			});
		});

		it('updates status to bounced on email.bounced', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();
				await createMailRecord({
					organization_id: org.id,
					resend_id: 'resend-bounced'
				});

				await mailRecordService.processWebhookEvent(
					makeWebhookPayload('email.bounced', 'resend-bounced')
				);

				const updated = await mailRecordService.getMailRecordByResendId(
					'resend-bounced'
				);
				expect(updated!.status).toBe('bounced');
				expect(updated!.bounced_at).toBeInstanceOf(Date);
			});
		});

		it('updates status to complained on email.complained', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();
				await createMailRecord({
					organization_id: org.id,
					resend_id: 'resend-complained'
				});

				await mailRecordService.processWebhookEvent(
					makeWebhookPayload('email.complained', 'resend-complained')
				);

				const updated = await mailRecordService.getMailRecordByResendId(
					'resend-complained'
				);
				expect(updated!.status).toBe('complained');
			});
		});

		it('updates status to delivery_delayed on email.delivery_delayed', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();
				await createMailRecord({
					organization_id: org.id,
					resend_id: 'resend-delayed'
				});

				await mailRecordService.processWebhookEvent(
					makeWebhookPayload('email.delivery_delayed', 'resend-delayed')
				);

				const updated = await mailRecordService.getMailRecordByResendId(
					'resend-delayed'
				);
				expect(updated!.status).toBe('delivery_delayed');
			});
		});

		it('updates status to failed with error reason on email.failed', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();
				await createMailRecord({
					organization_id: org.id,
					resend_id: 'resend-failed'
				});

				await mailRecordService.processWebhookEvent(
					makeWebhookPayload('email.failed', 'resend-failed', {
						failed: { reason: 'Mailbox full' }
					})
				);

				const updated = await mailRecordService.getMailRecordByResendId(
					'resend-failed'
				);
				expect(updated!.status).toBe('failed');
			});
		});

		it('does not update status on email.sent (already set on creation)', async () => {
			await withTestTransaction(async () => {
				const org = await createOrganization();
				await createMailRecord({
					organization_id: org.id,
					resend_id: 'resend-sent'
				});

				await mailRecordService.processWebhookEvent(
					makeWebhookPayload('email.sent', 'resend-sent')
				);

				const updated = await mailRecordService.getMailRecordByResendId(
					'resend-sent'
				);
				expect(updated!.status).toBe('sent');
			});
		});

		it('silently ignores webhook for unknown email_id', async () => {
			await withTestTransaction(async () => {
				await expect(
					mailRecordService.processWebhookEvent(
						makeWebhookPayload('email.delivered', 'unknown-resend-id')
					)
				).resolves.toBeUndefined();
			});
		});
	});
});
