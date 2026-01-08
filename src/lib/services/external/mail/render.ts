import { env } from '$env/dynamic/private';
import type {
	MagicInviteData,
	MagicLinkData,
	PasswordResetData,
	RenderedEmail,
	RenderRequest,
	RenderResponse,
	RouteShareData
} from './types';

export type {
	MagicInviteData,
	MagicLinkData,
	PasswordResetData,
	RenderedEmail,
	RouteShareData
} from './types';

export class RenderApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly response?: unknown
	) {
		super(message);
		this.name = 'RenderApiError';
	}
}

export class RenderClient {
	private get baseUrl(): string {
		const url = env.RENDER_SERVICE_URL;
		if (!url) {
			throw new Error(
				'Render service URL is required. Set RENDER_SERVICE_URL environment variable.'
			);
		}
		return url;
	}

	private get token(): string {
		const token = env.RENDER_TOKEN_WEND;
		if (!token) {
			throw new Error(
				'Render token is required. Set RENDER_TOKEN_WEND environment variable.'
			);
		}
		return token;
	}

	private async post(body: RenderRequest): Promise<RenderedEmail> {
		const response = await fetch(this.baseUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.token}`
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new RenderApiError(
				`Render API error: ${response.statusText}`,
				response.status,
				error
			);
		}

		const data: RenderResponse = await response.json();

		if (!data.success) {
			throw new RenderApiError(
				typeof data.error === 'string'
					? data.error
					: 'Render service returned an error',
				undefined,
				data.error
			);
		}

		return data.results;
	}

	async renderMagicLink(data: MagicLinkData): Promise<RenderedEmail> {
		return this.post({
			template_id: 'magic_link',
			props: data
		});
	}

	async renderConfirmEmail(data: MagicLinkData): Promise<RenderedEmail> {
		return this.post({
			template_id: 'confirm_email',
			props: data
		});
	}

	async renderMagicInvite(data: MagicInviteData): Promise<RenderedEmail> {
		return this.post({
			template_id: 'magic_invite',
			props: data
		});
	}

	async renderRouteShare(data: RouteShareData): Promise<RenderedEmail> {
		return this.post({
			template_id: 'route_share',
			props: data
		});
	}

	async renderPasswordReset(data: PasswordResetData): Promise<RenderedEmail> {
		return this.post({
			template_id: 'password_reset',
			props: data
		});
	}
}

export const renderClient = new RenderClient();
