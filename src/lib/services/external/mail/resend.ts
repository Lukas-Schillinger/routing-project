import { env } from '$env/dynamic/private';
import type { MagicInvite, MagicLogin } from '$lib/schemas/auth.js';
import { ServiceError } from '$lib/services/server/errors.js';
import { organizationService, userService } from '$lib/services/server/user.service.js';
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

	async sendMagicInviteEmail(
		magicInvite: MagicInvite,
		token: string,
		origin: string
	): Promise<CreateEmailResponse> {
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

		const res = await this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: magicInvite.email,
			subject: 'Welcome to Wend!',
			html,
			text
		});

		if (res.error) {
			throw ServiceError.internal(res.error.message);
		}

		return res;
	}

	async sendMagicLoginEmail(
		magicLogin: MagicLogin,
		token: string,
		origin: string
	): Promise<CreateEmailResponse> {
		const loginUrl = `${origin}/auth/magic/redeem?token=${token}&email=${encodeURIComponent(magicLogin.email)}`;

		const { html, text } = await renderClient.renderMagicLink({
			login_url: loginUrl,
			token
		});

		const res = await this.resend.emails.send({
			from: env.EMAIL_FROM,
			to: magicLogin.email,
			subject: 'Wend login link',
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
