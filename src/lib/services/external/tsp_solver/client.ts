import { env } from '$env/dynamic/private';

/**
 * TSP Solver API error class
 */
export class TspSolverApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly response?: unknown
	) {
		super(message);
		this.name = 'TspSolverApiError';
	}
}

/**
 * Core TSP Solver HTTP client
 * Handles communication with the FastAPI TSP solver service
 */
class TspSolverClient {
	private baseUrl: string;

	constructor(baseUrl?: string) {
		this.baseUrl = baseUrl || env.TSP_SOLVER_URL || 'http://localhost:8000';

		if (!this.baseUrl) {
			throw new Error('TSP Solver URL is required (set TSP_SOLVER_URL environment variable)');
		}
	}

	/**
	 * Make a POST request to the TSP solver API
	 */
	async post<T>(endpoint: string, body: unknown): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new TspSolverApiError(
					error.detail || error.message || `TSP Solver API error: ${response.statusText}`,
					response.status,
					error
				);
			}

			return response.json();
		} catch (error) {
			if (error instanceof TspSolverApiError) {
				throw error;
			}

			// Network or other errors
			throw new TspSolverApiError(
				error instanceof Error ? error.message : 'Failed to connect to TSP Solver API',
				500,
				error
			);
		}
	}

	/**
	 * Health check endpoint
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const url = `${this.baseUrl}/health`;
			const response = await fetch(url);
			return response.ok;
		} catch {
			return false;
		}
	}
}

// Singleton instance
export const tspSolverClient = new TspSolverClient();
