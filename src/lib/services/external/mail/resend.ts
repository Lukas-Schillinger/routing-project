import { env } from '$env/dynamic/private';
import type { CreateEmailResponse } from 'resend';
import { Resend } from 'resend';

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
		return this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: email,
			template: {
				id: 'magic-invitation',
				variables: {
					invite_url: inviteUrl
				}
			}
		});
	}

	async sendMagicLoginEmail(
		email: string,
		token: string,
		origin: string
	): Promise<CreateEmailResponse> {
		const loginUrl = `${origin}/auth/magic/redeem?token=${token}&email=${encodeURIComponent(email)}`;
		return this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: email,
			template: {
				id: 'magic-login',
				variables: {
					token,
					login_url: loginUrl
				}
			}
		});
	}
}

// Export singleton instance
export const resendClient = new ResendClient();
