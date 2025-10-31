/**
 * Base API client for making HTTP requests
 * Provides centralized error handling and request configuration
 */

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public data?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string = '/api') {
		this.baseUrl = baseUrl;
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		const config: RequestInit = {
			...options,
			headers: {
				...options.headers
			}
		};

		// Only set Content-Type for non-FormData requests
		// FormData automatically sets the correct Content-Type with boundary
		if (!(options.body instanceof FormData)) {
			config.headers = {
				'Content-Type': 'application/json',
				...config.headers
			};
		}

		try {
			const response = await fetch(url, config);

			// Parse response
			const data = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new ApiError(
					response.status,
					data.message || `Request failed: ${response.statusText}`,
					data
				);
			}

			return data as T;
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}

			// Network or parsing errors
			throw new ApiError(0, error instanceof Error ? error.message : 'An unknown error occurred');
		}
	}

	async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
		const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
		return this.request<T>(url, { method: 'GET' });
	}

	async post<T>(endpoint: string, body?: unknown): Promise<T> {
		let requestBody: BodyInit | undefined;

		if (body instanceof FormData) {
			// Send FormData as-is, don't stringify
			requestBody = body;
		} else if (body !== undefined) {
			// Stringify non-FormData bodies
			requestBody = JSON.stringify(body);
		}

		return this.request<T>(endpoint, {
			method: 'POST',
			body: requestBody
		});
	}

	async put<T>(endpoint: string, body?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: body ? JSON.stringify(body) : undefined
		});
	}

	async patch<T>(endpoint: string, body?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			body: body ? JSON.stringify(body) : undefined
		});
	}

	async delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}
}

// Singleton instance
export const apiClient = new ApiClient();
