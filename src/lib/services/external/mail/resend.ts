import { env } from '$env/dynamic/private';
import type { Invitation, LoginToken } from '$lib/schemas/auth.js';
import type { MailRecordType } from '$lib/schemas/mail-record.js';
import type { RouteShare } from '$lib/schemas/route-share.js';
import { ServiceError } from '$lib/services/server/errors.js';
import { invitationService } from '$lib/services/server/invitation.service.js';
import { loginTokenService } from '$lib/services/server/login-token.service.js';
import { mailRecordService } from '$lib/services/server/mail-record.service.js';
import { routeShareService } from '$lib/services/server/route-share.service.js';
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

	async sendInvitationEmail(invitation: Invitation, token: string, origin: string): Promise<void> {
		if (!invitation.created_by)
			throw ServiceError.internal('Invitation missing created_by attribution');

		const [user, organization] = await Promise.all([
			userService.getUser(invitation.created_by, invitation.organization_id),
			organizationService.getOrganization(invitation.organization_id, invitation.organization_id)
		]);

		const { html, text } = await renderClient.renderMagicInvite({
			invite_url: `${origin}/auth/redeem/invitation?token=${token}&email=${encodeURIComponent(invitation.email)}`,
			inviter_name: user.name,
			inviter_email: user.email,
			organization_name: organization.name
		});

		const mailRecordId = await this.sendEmail({
			organizationId: invitation.organization_id,
			type: 'invitation',
			to: invitation.email,
			subject: 'Welcome to Wend!',
			html,
			text
		});

		// Link mail record to invitation
		await invitationService.setMailRecordId(invitation.id, mailRecordId);
	}

	private async renderLoginEmail(login_url: string, token: string, isWelcome?: boolean) {
		if (isWelcome) {
			return renderClient.renderConfirmEmail({ login_url, token });
		}
		return renderClient.renderMagicLink({
			login_url,
			token
		});
	}

	async sendPasswordResetEmail(
		loginToken: LoginToken,
		email: string,
		token: string,
		origin: string
	): Promise<void> {
		const login_url = `${origin}/auth/redeem/password-reset?token=${token}&email=${encodeURIComponent(email)}`;

		const { html, text } = await renderClient.renderPasswordReset({ login_url });

		const mailRecordId = await this.sendEmail({
			organizationId: loginToken.organization_id,
			type: 'password_reset',
			to: email,
			subject: 'Reset your Wend password',
			html,
			text
		});

		await loginTokenService.setMailRecordId(loginToken.id, mailRecordId);
	}

	async sendLoginEmail(
		loginToken: LoginToken,
		email: string,
		token: string,
		origin: string,
		isWelcome?: boolean
	): Promise<void> {
		const login_url = `${origin}/auth/redeem/login-token?token=${token}&email=${encodeURIComponent(email)}`;

		const { html, text } = await this.renderLoginEmail(login_url, token);

		const mailRecordId = await this.sendEmail({
			organizationId: loginToken.organization_id,
			type: 'login_token',
			to: email,
			subject: isWelcome ? 'Wend email confirmation' : 'Wend login link',
			html,
			text
		});

		// Link mail record to login token
		await loginTokenService.setMailRecordId(loginToken.id, mailRecordId);
	}

	async sendRouteShareEmail(
		share: RouteShare,
		recipientEmail: string,
		token: string,
		routeTitle: string,
		driverName: string,
		origin: string
	): Promise<void> {
		const routeUrl = `${origin}/routes/${share.route_id}?token=${token}`;

		const { html, text } = await renderClient.renderRouteShare({
			route_url: routeUrl,
			route_title: routeTitle,
			driver_name: driverName
		});

		const mailRecordId = await this.sendEmail({
			organizationId: share.organization_id,
			type: 'route_share',
			to: recipientEmail,
			subject: `Route shared: ${routeTitle}`,
			html,
			text
		});

		// Link mail record to share
		await routeShareService.setMailRecordId(share.id, mailRecordId);
	}
}

// Export singleton instance
export const resendClient = new ResendClient();
