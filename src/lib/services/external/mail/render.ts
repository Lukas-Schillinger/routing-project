import { env } from '$env/dynamic/private';

// Request types
type MagicLinkRequest = {
	template_id: 'magic_link';
	props: {
		token: string;
		login_url: string;
	};
};

type MagicInviteRequest = {
	template_id: 'magic_invite';
	props: {
		invite_url: string;
	};
};

type RenderRequest = MagicLinkRequest | MagicInviteRequest;

// Response types
type RenderResponseSuccess = {
	success: true;
	results: {
		html: string;
		text: string;
	};
};

type RenderResponseFail = {
	success: false;
	error?: object | string;
};

type RenderResponse = RenderResponseSuccess | RenderResponseFail;

export type RenderedEmail = {
	html: string;
	text: string;
};

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
			throw new Error('Render token is required. Set RENDER_TOKEN_WEND environment variable.');
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
				typeof data.error === 'string' ? data.error : 'Render service returned an error',
				undefined,
				data.error
			);
		}

		return data.results;
	}

	async renderMagicLink(token: string, loginUrl: string): Promise<RenderedEmail> {
		return this.post({
			template_id: 'magic_link',
			props: {
				token,
				login_url: loginUrl
			}
		});
	}

	async renderMagicInvite(inviteUrl: string): Promise<RenderedEmail> {
		return this.post({
			template_id: 'magic_invite',
			props: {
				invite_url: inviteUrl
			}
		});
	}
}

export const renderClient = new RenderClient();
