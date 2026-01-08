/**
 * Service Mocks
 *
 * Mock implementations of external services for testing.
 */
import { vi } from 'vitest';
import type {
	AutocompleteOptions,
	BatchGeocodingOptions
} from '$lib/services/external/mapbox/geocoding';
import type {
	GeocodingFeature,
	GeocodingResponse
} from '$lib/services/external/mapbox/types';
import locationsData from './data/locations.json';

// ============================================================================
// Geocoding Service Mock
// ============================================================================

type AutocompleteCall = {
	searchText: string;
	options?: AutocompleteOptions;
};

type BatchCall = {
	searches: string[];
	options?: BatchGeocodingOptions;
};

/**
 * Mock for MapboxGeocodingService.
 * Returns predictable results from pre-geocoded test fixtures.
 *
 * @example
 * ```ts
 * const mockGeocoding = createMockGeocodingService();
 *
 * const results = await mockGeocoding.autocomplete('801 S Florida');
 * expect(results[0].properties.name).toContain('801');
 *
 * // Check what was called
 * expect(mockGeocoding.getCalls().autocomplete).toHaveLength(1);
 * ```
 */
export function createMockGeocodingService() {
	// Load test fixtures from locations.json
	// Cast through unknown because JSON doesn't preserve tuple types
	const fixtures = locationsData.map(
		(loc) => loc.geocode_raw as unknown as GeocodingFeature
	);

	// Track calls for assertions
	const calls: {
		autocomplete: AutocompleteCall[];
		batch: BatchCall[];
	} = {
		autocomplete: [],
		batch: []
	};

	// Custom response overrides
	let autocompleteOverride:
		| ((searchText: string, options?: AutocompleteOptions) => GeocodingFeature[])
		| null = null;
	let batchOverride:
		| ((searches: string[], options?: BatchGeocodingOptions) => GeocodingResponse[])
		| null = null;

	return {
		/**
		 * Mock autocomplete - searches fixtures by address name.
		 * Returns empty array for queries < 2 chars (matches real behavior).
		 */
		autocomplete: async (
			searchText: string,
			options?: AutocompleteOptions
		): Promise<GeocodingFeature[]> => {
			calls.autocomplete.push({ searchText, options });

			// Use custom override if set
			if (autocompleteOverride) {
				return autocompleteOverride(searchText, options);
			}

			// Return empty for short queries (matches real behavior)
			if (searchText.length < 2) return [];

			// Find matching fixtures by address
			const searchLower = searchText.toLowerCase();
			const matches = fixtures.filter(
				(f) =>
					f.properties.name?.toLowerCase().includes(searchLower) ||
					f.properties.full_address?.toLowerCase().includes(searchLower)
			);

			const limit = options?.limit ?? 8;
			return matches.slice(0, limit);
		},

		/**
		 * Mock batch geocoding - returns one result per search.
		 * Cycles through fixtures for consistent results.
		 */
		batch: async (
			searches: string[],
			options?: BatchGeocodingOptions
		): Promise<GeocodingResponse[]> => {
			calls.batch.push({ searches, options });

			// Use custom override if set
			if (batchOverride) {
				return batchOverride(searches, options);
			}

			// Enforce 50 address limit (matches real behavior)
			if (searches.length > 50) {
				throw new Error('Batch geocoding limited to 50 addresses');
			}

			// Return one FeatureCollection per search
			return searches.map((_, i) => ({
				type: 'FeatureCollection' as const,
				features: [fixtures[i % fixtures.length]],
				attribution: 'mock'
			}));
		},

		// ========== Test Utilities ==========

		/** Get all recorded calls for assertions */
		getCalls: () => ({ ...calls }),

		/** Clear recorded calls */
		clearCalls: () => {
			calls.autocomplete = [];
			calls.batch = [];
		},

		/** Get loaded fixtures */
		getFixtures: () => [...fixtures],

		/**
		 * Override autocomplete response for specific test scenarios.
		 * Pass null to clear override.
		 */
		setAutocompleteOverride: (
			fn:
				| ((
						searchText: string,
						options?: AutocompleteOptions
				  ) => GeocodingFeature[])
				| null
		) => {
			autocompleteOverride = fn;
		},

		/**
		 * Override batch response for specific test scenarios.
		 * Pass null to clear override.
		 */
		setBatchOverride: (
			fn:
				| ((searches: string[], options?: BatchGeocodingOptions) => GeocodingResponse[])
				| null
		) => {
			batchOverride = fn;
		}
	};
}

// ============================================================================
// Resend SDK Mock
// ============================================================================

type SentEmail = {
	from: string;
	to: string;
	subject: string;
	html: string;
	text: string;
};

/**
 * Mock for the Resend SDK.
 * Prevents actual email delivery while allowing mail service logic to run.
 *
 * @example
 * ```ts
 * const mockResend = createMockResend();
 *
 * vi.mock('resend', () => ({
 *   Resend: vi.fn().mockImplementation(() => mockResend)
 * }));
 *
 * // After calling mail service methods:
 * expect(mockResend.sentEmails).toHaveLength(1);
 * expect(mockResend.sentEmails[0].to).toBe('user@example.com');
 * ```
 */
export function createMockResend() {
	const sentEmails: SentEmail[] = [];
	let emailIdCounter = 0;

	return {
		/** Array of captured sent emails */
		sentEmails,

		/** Clear captured emails and reset counter (call in beforeEach) */
		clear: () => {
			sentEmails.length = 0;
			emailIdCounter = 0;
		},

		emails: {
			send: vi.fn().mockImplementation((params: SentEmail) => {
				sentEmails.push(params);
				return Promise.resolve({
					data: { id: `mock-resend-${++emailIdCounter}` },
					error: null
				});
			})
		}
	};
}

// ============================================================================
// RenderClient Mock
// ============================================================================

/**
 * Mock for the RenderClient (email template rendering service).
 * Returns placeholder HTML/text without making external API calls.
 *
 * @example
 * ```ts
 * const mockRenderClient = createMockRenderClient();
 *
 * vi.mock('$lib/services/external/mail/render', () => ({
 *   renderClient: mockRenderClient
 * }));
 *
 * // Verify specific render methods were called:
 * expect(mockRenderClient.renderMagicLink).toHaveBeenCalledWith(
 *   expect.objectContaining({ token: 'abc123' })
 * );
 * ```
 */
export function createMockRenderClient() {
	const mockRender = () =>
		Promise.resolve({
			html: '<p>Mock email content</p>',
			text: 'Mock email content'
		});

	return {
		renderMagicLink: vi.fn().mockImplementation(mockRender),
		renderConfirmEmail: vi.fn().mockImplementation(mockRender),
		renderMagicInvite: vi.fn().mockImplementation(mockRender),
		renderRouteShare: vi.fn().mockImplementation(mockRender),
		renderPasswordReset: vi.fn().mockImplementation(mockRender)
	};
}

// ============================================================================
// Placeholder Mocks (Not Yet Implemented)
// ============================================================================

/**
 * Mock for distance matrix service (src/lib/services/external/mapbox/distance-matrix.ts)
 * TODO: Return predictable duration matrix
 */
export function createMockDistanceMatrixService() {
	throw new Error('createMockDistanceMatrixService not implemented');
}

/**
 * Mock for navigation service (src/lib/services/external/mapbox/navigation.ts)
 * TODO: Return predictable route geometries
 */
export function createMockNavigationService() {
	throw new Error('createMockNavigationService not implemented');
}

/**
 * Mock for R2 service (src/lib/services/external/cloudflare/r2.ts)
 * TODO: In-memory file storage using Map
 */
export function createMockR2Service() {
	throw new Error('createMockR2Service not implemented');
}

/**
 * Mock for SQS service (used by optimization.service.ts)
 * TODO: Capture queued messages for test assertions
 */
export function createMockSqsService() {
	throw new Error('createMockSqsService not implemented');
}
