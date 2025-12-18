import { env } from '$env/dynamic/private';
import type { CreateEmailResponse } from 'resend';
import { Resend } from 'resend';
import { renderClient } from './render.js';

export class ResendClient {
	private resend: Resend;

	constructor(apiKey?: string) {
		const key = apiKey || env.RESEND_API_KEY;
		if (!key) {
			throw new Error('Resend API key is required. Set RESEND_API_KEY environment variable.');
		}
		this.resend = new Resend(key);
	}

	async sendMagicInviteEmail(email: string, inviteUrl: string): Promise<CreateEmailResponse> {
		const { html, text } = await renderClient.renderMagicInvite(inviteUrl);
		return this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: email,
			subject: 'You have been invited',
			html,
			text
		});
	}

	async sendMagicLoginEmail(
		email: string,
		token: string,
		origin: string
	): Promise<CreateEmailResponse> {
		const loginUrl = `${origin}/auth/magic/redeem?token=${token}&email=${encodeURIComponent(email)}`;
		const { html, text } = await renderClient.renderMagicLink(token, loginUrl);
		return this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: email,
			subject: 'Your login link',
			html,
			text
		});
	}
}

// Export singleton instance
export const resendClient = new ResendClient();
