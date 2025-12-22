import { env } from '$env/dynamic/private';
import { ServiceError } from '$lib/services/server/errors.js';
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
		const res = await this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: email,
			subject: 'You have been invited',
			html,
			text
		});

		if (res.error) {
			throw ServiceError.internal(res.error.message);
		}

		return res;
	}

	async sendMagicLoginEmail(
		email: string,
		token: string,
		origin: string
	): Promise<CreateEmailResponse> {
		const loginUrl = `${origin}/auth/magic/redeem?token=${token}&email=${encodeURIComponent(email)}`;
		const { html, text } = await renderClient.renderMagicLink(token, loginUrl);
		const res = await this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: email,
			subject: 'Your login link',
			html,
			text
		});

		if (res.error) {
			throw ServiceError.internal(res.error.message);
		}

		return res;
	}
}

// Export singleton instance
export const resendClient = new ResendClient();
