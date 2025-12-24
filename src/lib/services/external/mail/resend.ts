import { env } from '$env/dynamic/private';
import type { MagicInvite, MagicLogin } from '$lib/schemas/auth.js';
import type { MailRecordType } from '$lib/schemas/mail-record.js';
import { ServiceError } from '$lib/services/server/errors.js';
import { magicLinkService } from '$lib/services/server/magic-link.service.js';
import { mailRecordService } from '$lib/services/server/mail-record.service.js';
import { organizationService, userService } from '$lib/services/server/user.service.js';
import { Resend } from 'resend';
import { renderClient } from './render.js';

interface SendEmailParams {
	organizationId: string;
	type: MailRecordType;
	to: string;
	subject: string;
	html: string;
	text: string;
}

export class ResendClient {
	private resend: Resend;

	constructor(apiKey?: string) {
		const key = apiKey || env.RESEND_API_KEY;
		if (!key) {
			throw new Error('Resend API key is required. Set RESEND_API_KEY environment variable.');
		}
		this.resend = new Resend(key);
	}

	/**
	 * Private method to send email and create mail record
	 * All email sending should go through this method
	 */
	private async sendEmail(params: SendEmailParams): Promise<string> {
		const { organizationId, type, to, subject, html, text } = params;

		const res = await this.resend.emails.send({
			from: env.EMAIL_FROM,
			to,
			subject,
			html,
			text
		});

		if (res.error) {
			throw ServiceError.internal(res.error.message);
		}

		if (!res.data?.id) {
			throw ServiceError.internal('Resend did not return an email ID');
		}

		// Create mail record
		const mailRecord = await mailRecordService.createMailRecord({
			organization_id: organizationId,
			resend_id: res.data.id,
			type,
			to_email: to,
			from_email: env.EMAIL_FROM,
			subject
		});

		return mailRecord.id;
	}

	async sendMagicInviteEmail(
		magicInvite: MagicInvite,
		token: string,
		origin: string
	): Promise<void> {
		if (!magicInvite.created_by)
			throw ServiceError.internal('Magic Invite missing created_by attribution');

		const [user, organization] = await Promise.all([
			userService.getUser(magicInvite.created_by, magicInvite.organization_id),
			organizationService.getOrganization(magicInvite.organization_id, magicInvite.organization_id)
		]);

		const { html, text } = await renderClient.renderMagicInvite({
			invite_url: `${origin}/auth/magic/redeem?token=${token}`,
			inviter_name: user.name,
			inviter_email: user.email,
			organization_name: organization.name
		});

		const mailRecordId = await this.sendEmail({
			organizationId: magicInvite.organization_id,
			type: 'magic_invite',
			to: magicInvite.email,
			subject: 'Welcome to Wend!',
			html,
			text
		});

		// Link mail record to magic invite
		await magicLinkService.setMailRecordId(magicInvite.id, mailRecordId);
	}

	async sendMagicLoginEmail(magicLogin: MagicLogin, token: string, origin: string): Promise<void> {
		const loginUrl = `${origin}/auth/magic/redeem?token=${token}&email=${encodeURIComponent(magicLogin.email)}`;

		const { html, text } = await renderClient.renderMagicLink({
			login_url: loginUrl,
			token
		});

		const mailRecordId = await this.sendEmail({
			organizationId: magicLogin.organization_id,
			type: 'magic_login',
			to: magicLogin.email,
			subject: 'Wend login link',
			html,
			text
		});

		// Link mail record to magic login
		await magicLinkService.setMailRecordId(magicLogin.id, mailRecordId);
	}
}

// Export singleton instance
export const resendClient = new ResendClient();
