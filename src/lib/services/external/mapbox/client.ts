import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';

const log = logger.child({ service: 'mapbox' });

/**
 * Mapbox API error class
 */
export class MapboxApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly response?: unknown
	) {
		super(message);
		this.name = 'MapboxApiError';
	}
}

/**
 * Core Mapbox API client for HTTP requests
 */
class MapboxClient {
	private baseUrl = 'https://api.mapbox.com';
	private accessToken: string;

	constructor(accessToken?: string) {
		this.accessToken = accessToken || env.MAPBOX_ACCESS_TOKEN || '';

		if (!this.accessToken) {
			throw new Error('Mapbox access token is required');
		}
	}

	/**
	 * Make a GET request to the Mapbox API
	 */
	async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
		const url = new URL(`${this.baseUrl}${endpoint}`);
		url.searchParams.set('access_token', this.accessToken);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.set(key, value);
			});
		}

		const start = Date.now();
		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});
		const duration = Date.now() - start;

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			log.warn(
				{ endpoint, status: response.status, duration },
				'Mapbox API error'
			);
			throw new MapboxApiError(
				error.message || `Mapbox API error: ${response.statusText}`,
				response.status,
				error
			);
		}

		log.debug({ endpoint, status: response.status, duration }, 'Mapbox GET');
		return response.json();
	}

	/**
	 * Make a POST request to the Mapbox API
	 */
	async post<T>(
		endpoint: string,
		body: unknown,
		params?: Record<string, string>
	): Promise<T> {
		const url = new URL(`${this.baseUrl}${endpoint}`);
		url.searchParams.set('access_token', this.accessToken);

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				url.searchParams.set(key, value);
			});
		}

		const start = Date.now();
		const response = await fetch(url.toString(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		const duration = Date.now() - start;

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			log.warn(
				{ endpoint, status: response.status, duration },
				'Mapbox API error'
			);
			throw new MapboxApiError(
				error.message || `Mapbox API error: ${response.statusText}`,
				response.status,
				error
			);
		}

		log.debug({ endpoint, status: response.status, duration }, 'Mapbox POST');
		return response.json();
	}
}

// Singleton instance
export const mapboxClient = new MapboxClient();
