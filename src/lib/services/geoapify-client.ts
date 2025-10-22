import { env } from '$env/dynamic/private';
import type { GeoApifyError } from './geoapify-types.js';

/**
 * Configuration for GeoApify API client
 */
export interface GeoApifyConfig {
	apiKey: string;
	baseUrl?: string;
	timeout?: number;
}

/**
 * GeoApify API request options
 */
export interface GeoApifyRequestOptions {
	method?: 'GET' | 'POST';
	body?: string | FormData;
	headers?: Record<string, string>;
	timeout?: number;
}

/**
 * GeoApify API error class
 */
export class GeoApifyApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
		public readonly code?: string,
		public readonly response?: unknown
	) {
		super(message);
		this.name = 'GeoApifyApiError';
	}
}

/**
 * Core GeoApify API client
 */
export class GeoApifyApiClient {
	private config: Required<GeoApifyConfig>;

	constructor(config?: Partial<GeoApifyConfig>) {
		this.config = {
			apiKey: config?.apiKey || env.GEOAPIFY_API_KEY || '',
			baseUrl: config?.baseUrl || 'https://api.geoapify.com',
			timeout: config?.timeout || 30000
		};

		if (!this.config.apiKey) {
			throw new Error('GeoApify API key is required');
		}
	}

	/**
	 * Make a request to the GeoApify API
	 */
	async request<T = unknown>(endpoint: string, options: GeoApifyRequestOptions = {}): Promise<T> {
		const url = new URL(endpoint, this.config.baseUrl);
		url.searchParams.set('apiKey', this.config.apiKey);

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);

		try {
			const response = await fetch(url.toString(), {
				method: options.method || 'GET',
				headers: {
					'Content-Type': 'application/json',
					...options.headers
				},
				body: options.body,
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await this.parseErrorResponse(response);
				throw new GeoApifyApiError(
					errorData.message || `HTTP ${response.status}: ${response.statusText}`,
					response.status,
					errorData.error,
					errorData
				);
			}

			const data = await response.json();
			return data as T;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof GeoApifyApiError) {
				throw error;
			}

			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new GeoApifyApiError('Request timeout', undefined, 'TIMEOUT');
				}
				throw new GeoApifyApiError(`Network error: ${error.message}`);
			}

			throw new GeoApifyApiError('Unknown error occurred');
		}
	}

	/**
	 * Parse error response from GeoApify API
	 */
	private async parseErrorResponse(response: Response): Promise<GeoApifyError> {
		try {
			const data = await response.json();
			return {
				message: data.message || data.error || 'Unknown error',
				error: data.error,
				statusCode: response.status
			};
		} catch {
			return {
				message: `HTTP ${response.status}: ${response.statusText}`,
				statusCode: response.status
			};
		}
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): Readonly<GeoApifyConfig> {
		return { ...this.config };
	}

	/**
	 * Update the API key
	 */
	setApiKey(key: string): void {
		this.config.apiKey = key;
	}
}

/**
 * Default GeoApify client instance
 */
export const geoapifyClient = new GeoApifyApiClient();
