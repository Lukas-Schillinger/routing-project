import { env } from '$env/dynamic/private';
import formData from 'form-data';
import Mailgun from 'mailgun.js';

export interface SendEmailRequest {
	// Link tracking options have been removed here because they were breaking email links.
	to: string | string[];
	from?: string;
	subject?: string; // Optional when using templates
	html?: string;
	text?: string;
	template?: string;
	'h:X-Mailgun-Variables'?: string; // JSON string of template variables
	cc?: string | string[];
	bcc?: string | string[];
	'h:Reply-To'?: string;
}

export interface SendTemplateEmailRequest {
	to: string | string[];
	from: string;
	template: string;
	template_variables?: Record<string, unknown>;
	tags?: string[];
	tracking?: boolean;
	tracking_clicks?: boolean | 'yes' | 'no' | 'htmlonly';
	tracking_opens?: boolean | 'yes' | 'no';
	cc?: string | string[];
	bcc?: string | string[];
	reply_to?: string;
}

export interface SendEmailResponse {
	id: string;
	message: string;
}

export interface MailgunError {
	message: string;
	error?: string;
}

export class MailgunClient {
	private client: ReturnType<Mailgun['client']>;
	private domain: string;

	constructor(apiKey?: string, domain?: string) {
		const key = apiKey || env.MAILGUN_API_KEY || '';
		this.domain = domain || env.MAILGUN_DOMAIN || '';

		if (!key) {
			throw new Error('Mailgun API key is required. Set MAILGUN_API_KEY environment variable.');
		}
		if (!this.domain) {
			throw new Error('Mailgun domain is required. Set MAILGUN_DOMAIN environment variable.');
		}

		// Initialize Mailgun client
		const mailgun = new Mailgun(formData);

		// Determine API endpoint based on domain (EU vs US)
		const isEuDomain = this.domain.includes('.eu.');
		this.client = mailgun.client({
			username: 'api',
			key: key,
			url: isEuDomain ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
		});
	}

	async sendEmail(emailData: SendEmailRequest): Promise<SendEmailResponse> {
		try {
			// Convert our interface to Mailgun SDK format
			const mailgunData = {
				from: emailData.from ? emailData.from : env.EMAIL_FROM,
				to: emailData.to,
				subject: emailData.subject,
				html: emailData.html,
				text: emailData.text,
				template: emailData.template,
				...(emailData.cc && { cc: emailData.cc }),
				...(emailData.bcc && { bcc: emailData.bcc }),
				...(emailData['h:Reply-To'] && { 'h:Reply-To': emailData['h:Reply-To'] }),
				...(emailData['h:X-Mailgun-Variables'] && {
					'h:X-Mailgun-Variables': emailData['h:X-Mailgun-Variables']
				})
			};

			// Remove undefined values to avoid Mailgun SDK issues
			const cleanedData = Object.fromEntries(
				Object.entries(mailgunData).filter(([, value]) => value !== undefined)
			);

			const response = await this.client.messages.create(this.domain, cleanedData as never);

			return {
				id: response.id || '',
				message: response.message || 'Email sent successfully'
			};
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`Mailgun API error: ${errorMessage}`);
		}
	}

	async sendTemplateEmail(emailData: SendTemplateEmailRequest): Promise<SendEmailResponse> {
		return this.sendEmail({
			to: emailData.to,
			from: emailData.from,
			template: emailData.template,
			'h:X-Mailgun-Variables': emailData.template_variables
				? JSON.stringify(emailData.template_variables)
				: undefined,
			cc: emailData.cc,
			bcc: emailData.bcc,
			'h:Reply-To': emailData.reply_to
		});
	}

	async sendMagicInviteEmail(email: string, inviteUrl: string): Promise<SendEmailResponse> {
		const templateName = 'wend-magic-invite';

		return this.sendTemplateEmail({
			to: email,
			from: env.EMAIL_FROM,
			template: templateName,
			template_variables: {
				invite_url: inviteUrl
			},
			tags: ['magic-link', 'invite'],
			tracking: true
		});
	}

	async sendMagicLoginEmail(email: string, loginUrl: string): Promise<SendEmailResponse> {
		const templateName = 'wend-magic-login';

		return this.sendTemplateEmail({
			to: email,
			from: env.EMAIL_FROM,
			template: templateName,
			template_variables: {
				login_url: loginUrl
			},
			tags: ['magic-link', 'login'],
			tracking: true
		});
	}

	async sendPasswordResetEmail(email: string, resetUrl: string): Promise<SendEmailResponse> {
		const templateName = 'wend-password-reset';

		return this.sendTemplateEmail({
			to: email,
			from: env.EMAIL_FROM,
			template: templateName,
			template_variables: {
				reset_url: resetUrl
			},
			tags: ['password-reset'],
			tracking: true
		});
	}

	async sendWelcomeEmail(
		email: string,
		userName?: string,
		organizationName?: string
	): Promise<SendEmailResponse> {
		const templateName = 'welcome-to-wend';

		return this.sendTemplateEmail({
			to: email,
			from: env.EMAIL_FROM,
			template: templateName,
			template_variables: {
				user_name: userName || 'there',
				organization_name: organizationName || 'Wend'
			},
			tags: ['welcome', 'onboarding'],
			tracking: true
		});
	}
}

// Export singleton instance
export const mailgunClient = new MailgunClient();
