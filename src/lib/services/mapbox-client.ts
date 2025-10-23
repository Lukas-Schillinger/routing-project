import { env } from '$env/dynamic/public';
import type { MapboxError } from './mapbox-types.js';

/**
 * Configuration for Mapbox API client
 */
export interface MapboxConfig {
	accessToken: string;
	baseUrl?: string;
	timeout?: number;
}

/**
 * Mapbox API request options
 */
export interface MapboxRequestOptions {
	method?: 'GET' | 'POST';
	body?: string | FormData;
	headers?: Record<string, string>;
	timeout?: number;
}

/**
 * Mapbox API error class
 */
export class MapboxApiError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
		public readonly code?: string,
		public readonly response?: unknown
	) {
		super(message);
		this.name = 'MapboxApiError';
	}
}

/**
 * Core Mapbox API client
 */
export class MapboxApiClient {
	private config: Required<MapboxConfig>;

	constructor(config?: Partial<MapboxConfig>) {
		this.config = {
			accessToken: config?.accessToken || env.PUBLIC_MAPBOX_ACCESS_TOKEN || '',
			baseUrl: config?.baseUrl || 'https://api.mapbox.com',
			timeout: config?.timeout || 30000
		};

		if (!this.config.accessToken) {
			throw new Error('Mapbox access token is required');
		}
	}

	/**
	 * Make a request to the Mapbox API
	 */
	async request<T = unknown>(endpoint: string, options: MapboxRequestOptions = {}): Promise<T> {
		const url = new URL(endpoint, this.config.baseUrl);
		url.searchParams.set('access_token', this.config.accessToken);

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
				throw new MapboxApiError(
					errorData.message || `HTTP ${response.status}: ${response.statusText}`,
					response.status,
					errorData.code,
					errorData
				);
			}

			const data = await response.json();
			return data as T;
		} catch (error) {
			clearTimeout(timeoutId);

			if (error instanceof MapboxApiError) {
				throw error;
			}

			if (error instanceof Error) {
				if (error.name === 'AbortError') {
					throw new MapboxApiError('Request timeout', undefined, 'TIMEOUT');
				}
				throw new MapboxApiError(`Network error: ${error.message}`);
			}

			throw new MapboxApiError('Unknown error occurred');
		}
	}

	/**
	 * Parse error response from Mapbox API
	 */
	private async parseErrorResponse(response: Response): Promise<MapboxError> {
		try {
			const data = await response.json();
			return {
				message: data.message || data.error || 'Unknown error',
				code: data.code
			};
		} catch {
			return {
				message: `HTTP ${response.status}: ${response.statusText}`
			};
		}
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): Readonly<MapboxConfig> {
		return { ...this.config };
	}

	/**
	 * Update the access token
	 */
	setAccessToken(token: string): void {
		this.config.accessToken = token;
	}
}

/**
 * Default Mapbox client instance
 */
export const mapboxClient = new MapboxApiClient();
