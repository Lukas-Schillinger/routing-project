import { env } from '$env/dynamic/private';
import type { Invitation, LoginToken } from '$lib/schemas/auth';
import type { MailRecordType } from '$lib/schemas/mail-record';
import type { Organization } from '$lib/schemas/organization';
import type { RouteShare } from '$lib/schemas/route-share';
import type { PublicUser } from '$lib/schemas/user';
import { logger } from '$lib/server/logger';
import { ServiceError } from '$lib/services/server/errors';
import { invitationService } from '$lib/services/server/invitation.service';
import { loginTokenService } from '$lib/services/server/login-token.service';
import { mailRecordService } from '$lib/services/server/mail-record.service';
import { routeShareService } from '$lib/services/server/route-share.service';
import { Resend } from 'resend';
import {
	type RenderClient,
	renderClient as defaultRenderer
} from '$lib/services/external/mail/render';
import type { RenderedEmail } from '$lib/services/external/mail/types';

const log = logger.child({ service: 'mail' });

// EmailSender and EmailRenderer are pulled out of the MailService to facilitate testing.

export type EmailSender = {
	emails: {
		send(params: {
			from: string;
			to: string;
			subject: string;
			html: string;
			text: string;
		}): Promise<{
			data: { id: string } | null;
			error: { message: string } | null;
		}>;
	};
};

export type EmailRenderer = Omit<RenderClient, never>;

type SendEmailParams = {
	organizationId: string;
	type: MailRecordType;
	to: string;
	subject: string;
	html: string;
	text: string;
};

export class MailService {
	private emailSender: EmailSender;
	private renderer: EmailRenderer;

	constructor(deps?: {
		emailSender?: EmailSender;
		renderer?: EmailRenderer;
		apiKey?: string;
	}) {
		if (deps?.emailSender) {
			this.emailSender = deps.emailSender;
		} else {
			const key = deps?.apiKey || env.RESEND_API_KEY;
			if (!key) {
				throw ServiceError.internal(
					'Resend API key is required. Set RESEND_API_KEY environment variable.'
				);
			}
			this.emailSender = new Resend(key);
		}
		this.renderer = deps?.renderer ?? defaultRenderer;
	}

	private async sendEmail(params: SendEmailParams): Promise<string> {
		const { organizationId, type, to, subject, html, text } = params;

		log.info({ type, to, organizationId }, 'Sending email');

		const res = await this.emailSender.emails.send({
			from: env.EMAIL_FROM,
			to,
			subject,
			html,
			text
		});

		if (res.error) {
			log.error({ type, to, error: res.error.message }, 'Email send failed');
			throw ServiceError.internal(res.error.message);
		}

		if (!res.data?.id) {
			log.error({ type, to }, 'Resend did not return an email ID');
			throw ServiceError.internal('Resend did not return an email ID');
		}

		const mailRecord = await mailRecordService.createMailRecord({
			organization_id: organizationId,
			resend_id: res.data.id,
			type,
			to_email: to,
			from_email: env.EMAIL_FROM,
			subject
		});

		log.info(
			{ type, to, resendId: res.data.id, mailRecordId: mailRecord.id },
			'Email sent'
		);

		return mailRecord.id;
	}

	async sendInvitationEmail(
		invitation: Invitation,
		token: string,
		user: PublicUser,
		organization: Organization,
		origin: string
	): Promise<void> {
		if (!invitation.created_by)
			throw ServiceError.internal('Invitation missing created_by attribution');

		const { html, text } = await this.renderer.renderMagicInvite({
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

		await invitationService.setMailRecordId(invitation.id, mailRecordId);
	}

	private async renderLoginEmail(
		login_url: string,
		token: string,
		isWelcome?: boolean
	): Promise<RenderedEmail> {
		if (isWelcome) {
			return this.renderer.renderConfirmEmail({ login_url, token });
		}
		return this.renderer.renderMagicLink({
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

		const { html, text } = await this.renderer.renderPasswordReset({
			login_url
		});

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

		const { html, text } = await this.renderLoginEmail(
			login_url,
			token,
			isWelcome
		);

		const mailRecordId = await this.sendEmail({
			organizationId: loginToken.organization_id,
			type: 'login_token',
			to: email,
			subject: isWelcome ? 'Wend email confirmation' : 'Wend login link',
			html,
			text
		});

		await loginTokenService.setMailRecordId(loginToken.id, mailRecordId);
	}

	async sendBillingNotificationEmails(
		organizationId: string,
		adminEmails: string[],
		type: 'payment_failed' | 'payment_action_required',
		context: { hostedInvoiceUrl?: string | null }
	): Promise<void> {
		const { html, text } = await this.renderer.renderBillingNotification({
			type,
			hosted_invoice_url: context.hostedInvoiceUrl ?? undefined
		});
		const subject =
			type === 'payment_failed'
				? 'Action required: payment failed'
				: 'Action required: payment needs authentication';

		const results = await Promise.allSettled(
			adminEmails.map((email) =>
				this.sendEmail({
					organizationId,
					type,
					to: email,
					subject,
					html,
					text
				})
			)
		);

		for (const result of results) {
			if (result.status === 'rejected') {
				log.error(
					{ err: result.reason, type, organizationId },
					'Failed to send billing notification to one admin'
				);
			}
		}
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

		const { html, text } = await this.renderer.renderRouteShare({
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

		await routeShareService.setMailRecordId(share.id, mailRecordId);
	}
}

export const mailService = new MailService();
