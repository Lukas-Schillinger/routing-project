import { env } from '$env/dynamic/private';

export interface SendEmailRequest {
	to: string | string[];
	from: string;
	subject: string;
	html?: string;
	text?: string;
	reply_to?: string;
	cc?: string | string[];
	bcc?: string | string[];
}

export interface SendTemplateEmailRequest {
	to: string | string[];
	from: string;
	template_id: string;
	template_data?: Record<string, unknown>;
	reply_to?: string;
	cc?: string | string[];
	bcc?: string | string[];
}

export interface SendEmailResponse {
	id: string;
}

export interface ResendError {
	message: string;
	name: string;
}

export class ResendClient {
	private apiKey: string;
	private baseUrl = 'https://api.resend.com';

	constructor(apiKey?: string) {
		this.apiKey = apiKey || env.RESEND_API_KEY || '';
		if (!this.apiKey) {
			throw new Error('Resend API key is required. Set RESEND_API_KEY environment variable.');
		}
	}

	async sendEmail(emailData: SendEmailRequest): Promise<SendEmailResponse> {
		const response = await fetch(`${this.baseUrl}/emails`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(emailData)
		});

		const data = await response.json();

		if (!response.ok) {
			const error: ResendError = data;
			throw new Error(`Resend API error: ${error.message}`);
		}

		return data as SendEmailResponse;
	}

	async sendTemplateEmail(emailData: SendTemplateEmailRequest): Promise<SendEmailResponse> {
		const response = await fetch(`${this.baseUrl}/emails`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(emailData)
		});

		const data = await response.json();

		if (!response.ok) {
			const error: ResendError = data;
			throw new Error(`Resend API error: ${error.message}`);
		}

		return data as SendEmailResponse;
	}

	async sendMagicInviteEmail(email: string, inviteUrl: string): Promise<SendEmailResponse> {
		const templateId = env.RESEND_MAGIC_INVITE_TEMPLATE_ID || 'magic-invite';

		return this.sendTemplateEmail({
			to: email,
			from: env.FROM_EMAIL || 'noreply@example.com',
			template_id: templateId,
			template_data: {
				invite_url: inviteUrl
			}
		});
	}

	async sendMagicLoginEmail(email: string, loginUrl: string): Promise<SendEmailResponse> {
		const templateId = env.RESEND_MAGIC_LOGIN_TEMPLATE_ID || 'magic-login';

		return this.sendTemplateEmail({
			to: email,
			from: env.FROM_EMAIL || 'noreply@example.com',
			template_id: templateId,
			template_data: {
				login_url: loginUrl
			}
		});
	}
}

// Export singleton instance
export const resendClient = new ResendClient();
