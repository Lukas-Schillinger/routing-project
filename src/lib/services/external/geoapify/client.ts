import { env } from '$env/dynamic/private';

/**
 * GeoApify API error class
 */
export class GeoapifyApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly response?: unknown
	) {
		super(message);
		this.name = 'GeoapifyApiError';
	}
}

/**
 * Core GeoApify API client for HTTP requests
 */
class GeoapifyClient {
	private baseUrl = 'https://api.geoapify.com/v1';
	private apiKey: string;

	constructor(apiKey?: string) {
		this.apiKey = apiKey || env.GEOAPIFY_API_KEY || '';

		if (!this.apiKey) {
			throw new Error('Geoapify API key is required');
		}
	}

	/**
	 * Make a POST request to the Geoapify API
	 */
	async post<T>(endpoint: string, body: unknown): Promise<T> {
		const url = `${this.baseUrl}${endpoint}?apiKey=${this.apiKey}`;

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new GeoapifyApiError(
				error.message || `Geoapify API error: ${response.statusText}`,
				response.status,
				error
			);
		}

		return response.json();
	}

	/**
	 * Make a GET request to the Geoapify API
	 */
	async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
		const url = new URL(`${this.baseUrl}${endpoint}`);
		url.searchParams.set('apiKey', this.apiKey);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.set(key, value);
			});
		}

		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new GeoapifyApiError(
				error.message || `Geoapify API error: ${response.statusText}`,
				response.status,
				error
			);
		}

		return response.json();
	}
}

// Singleton instance
export const geoapifyClient = new GeoapifyClient();
