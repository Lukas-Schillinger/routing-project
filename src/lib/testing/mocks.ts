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
	CoordinatesData,
	DistanceMatrixResult
} from '$lib/services/external/mapbox/distance-matrix';
import type {
	Coordinate,
	DirectionsResponseGeoJson,
	GeocodingFeature,
	GeocodingResponse,
	GeoJsonLineString
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
// Distance Matrix Service Mock
// ============================================================================

type CreateDistanceMatrixCall = {
	coordinatesData: CoordinatesData;
};

/**
 * Mock for MapboxDistanceMatrixService.
 * Returns predictable duration matrices based on coordinate indices.
 *
 * @example
 * ```ts
 * const mockMatrix = createMockDistanceMatrixService();
 *
 * const result = await mockMatrix.createDistanceMatrix({
 *   coordinates: [[-81.95, 28.03], [-81.96, 28.04]],
 *   locationIds: ['depot-1', 'stop-1']
 * });
 *
 * // Check matrix values
 * expect(result.matrix[0][0]).toBe(0);  // Same location
 * expect(result.matrix[0][1]).toBe(330); // 5.5 minutes
 *
 * // Check what was called
 * expect(mockMatrix.getCalls().createDistanceMatrix).toHaveLength(1);
 * ```
 */
export function createMockDistanceMatrixService() {
	const calls: { createDistanceMatrix: CreateDistanceMatrixCall[] } = {
		createDistanceMatrix: []
	};

	let override: ((data: CoordinatesData) => DistanceMatrixResult) | null =
		null;

	return {
		/**
		 * Mock createDistanceMatrix - generates predictable duration matrix.
		 * Validates constraints like the real service (min 2, max 25 coordinates).
		 */
		createDistanceMatrix: async (
			coordinatesData: CoordinatesData
		): Promise<DistanceMatrixResult> => {
			calls.createDistanceMatrix.push({ coordinatesData });

			// Use custom override if set
			if (override) {
				return override(coordinatesData);
			}

			const { coordinates, locationIds } = coordinatesData;

			// Validate constraints (matches real service)
			if (coordinates.length < 2) {
				throw new Error(
					'At least 2 locations required (depot + 1 stop minimum)'
				);
			}
			if (coordinates.length > 25) {
				throw new Error('Maximum 25 coordinates allowed');
			}
			if (coordinates.length !== locationIds.length) {
				throw new Error(
					'Coordinates and locationIds must have same length'
				);
			}

			// Generate deterministic matrix based on indices
			// Formula: 300 + (i * 60) + (j * 30) seconds
			// Range: ~5-25 minutes for realistic route testing
			const n = coordinates.length;
			const matrix: number[][] = [];

			for (let i = 0; i < n; i++) {
				const row: number[] = [];
				for (let j = 0; j < n; j++) {
					if (i === j) {
						row.push(0); // Same location = 0 duration
					} else {
						row.push(300 + i * 60 + j * 30);
					}
				}
				matrix.push(row);
			}

			return { matrix, locationIds };
		},

		// ========== Test Utilities ==========

		/** Get all recorded calls for assertions */
		getCalls: () => ({ ...calls }),

		/** Clear recorded calls */
		clearCalls: () => {
			calls.createDistanceMatrix = [];
		},

		/**
		 * Override createDistanceMatrix response for specific test scenarios.
		 * Pass null to clear override.
		 */
		setOverride: (
			fn: ((data: CoordinatesData) => DistanceMatrixResult) | null
		) => {
			override = fn;
		}
	};
}

// ============================================================================
// Navigation Service Mock
// ============================================================================

type DirectionsCall = {
	locations: Coordinate[];
};

/**
 * Mock for MapboxNavigationService.
 * Returns predictable route geometries based on input coordinates.
 *
 * @example
 * ```ts
 * const mockNavigation = createMockNavigationService();
 *
 * vi.mock('$lib/services/external/mapbox/navigation', () => ({
 *   mapboxNavigation: mockNavigation
 * }));
 *
 * // After calling navigation:
 * expect(mockNavigation.getCalls()).toHaveLength(1);
 * expect(mockNavigation.getCalls()[0].locations).toHaveLength(5);
 * ```
 */
export function createMockNavigationService() {
	const calls: DirectionsCall[] = [];

	let directionsOverride:
		| ((locations: Coordinate[]) => DirectionsResponseGeoJson)
		| null = null;

	return {
		/**
		 * Mock getDirections - generates route from input coordinates.
		 * Returns a LineString connecting all waypoints with estimated duration.
		 */
		getDirections: async (
			locations: Coordinate[]
		): Promise<DirectionsResponseGeoJson> => {
			calls.push({ locations: [...locations] });

			if (directionsOverride) {
				return directionsOverride(locations);
			}

			// Validate like real service
			if (locations.length < 2) {
				throw new Error('At least 2 locations required');
			}
			if (locations.length > 25) {
				throw new Error('Maximum 25 locations allowed');
			}

			// Generate mock geometry from input coordinates
			const geometry: GeoJsonLineString = {
				type: 'LineString',
				coordinates: locations
			};

			// Estimate ~5 minutes per segment
			const duration = (locations.length - 1) * 300;

			// Estimate ~2km per segment
			const distance = (locations.length - 1) * 2000;

			return {
				code: 'Ok',
				routes: [
					{
						geometry,
						duration,
						distance,
						legs: locations.slice(1).map((_, i) => ({
							distance: 2000,
							duration: 300,
							summary: `Leg ${i + 1}`
						}))
					}
				],
				waypoints: locations.map((loc, i) => ({
					name: `Waypoint ${i}`,
					location: loc,
					distance: 0
				}))
			};
		},

		// ========== Test Utilities ==========

		/** Get all recorded calls for assertions */
		getCalls: () => [...calls],

		/** Clear recorded calls */
		clearCalls: () => {
			calls.length = 0;
		},

		/**
		 * Override getDirections response for specific test scenarios.
		 * Pass null to clear override.
		 */
		setDirectionsOverride: (
			fn: ((locations: Coordinate[]) => DirectionsResponseGeoJson) | null
		) => {
			directionsOverride = fn;
		}
	};
}

// ============================================================================
// R2 Service Mock
// ============================================================================

type StoredFile = {
	data: Uint8Array;
	contentType: string;
	metadata?: Record<string, string>;
	uploadedAt: Date;
};

type UploadCall = {
	key: string;
	file: Buffer | Uint8Array;
	contentType: string;
	metadata?: Record<string, string>;
};

type DeleteCall = {
	key: string;
};

type GetSignedUrlCall = {
	key: string;
	expiresIn: number;
};

type GenerateKeyCall = {
	organizationId: string;
	userId: string;
	originalFilename: string;
};

/**
 * Mock for R2Service (Cloudflare R2 object storage).
 * Provides in-memory file storage for testing file upload/download flows.
 *
 * @example
 * ```ts
 * const mockR2 = createMockR2Service();
 *
 * vi.mock('$lib/services/external/cloudflare/r2', () => ({
 *   r2Service: mockR2
 * }));
 *
 * // After file operations:
 * expect(mockR2.getCalls().upload).toHaveLength(1);
 * expect(mockR2.getStoredFile('org/user/file.pdf')).toBeDefined();
 *
 * // Test error handling:
 * mockR2.setNextError(new Error('R2 unavailable'));
 * await expect(service.uploadFile(...)).rejects.toThrow();
 * ```
 */
export function createMockR2Service() {
	// In-memory file storage
	const storage = new Map<string, StoredFile>();

	// Track calls for assertions
	const calls: {
		upload: UploadCall[];
		delete: DeleteCall[];
		getSignedUrl: GetSignedUrlCall[];
		generateKey: GenerateKeyCall[];
	} = {
		upload: [],
		delete: [],
		getSignedUrl: [],
		generateKey: []
	};

	// Override functions for edge cases
	let uploadOverride:
		| ((
				key: string,
				file: Buffer | Uint8Array,
				contentType: string,
				metadata?: Record<string, string>
		  ) => Promise<void>)
		| null = null;
	let deleteOverride: ((key: string) => Promise<void>) | null = null;
	let getSignedUrlOverride:
		| ((key: string, expiresIn: number) => Promise<string>)
		| null = null;

	// One-shot error injection
	let nextError: Error | null = null;

	const checkAndThrowError = () => {
		if (nextError) {
			const error = nextError;
			nextError = null;
			throw error;
		}
	};

	return {
		/**
		 * Mock uploadFile - stores file data in memory.
		 */
		uploadFile: async (
			key: string,
			file: Buffer | Uint8Array,
			contentType: string,
			metadata?: Record<string, string>
		): Promise<void> => {
			calls.upload.push({ key, file, contentType, metadata });
			checkAndThrowError();

			if (uploadOverride) {
				return uploadOverride(key, file, contentType, metadata);
			}

			storage.set(key, {
				data: file instanceof Buffer ? new Uint8Array(file) : file,
				contentType,
				metadata,
				uploadedAt: new Date()
			});
		},

		/**
		 * Mock deleteFile - removes file from memory.
		 * Permissive like real R2/S3 (no error on missing key).
		 */
		deleteFile: async (key: string): Promise<void> => {
			calls.delete.push({ key });
			checkAndThrowError();

			if (deleteOverride) {
				return deleteOverride(key);
			}

			storage.delete(key);
		},

		/**
		 * Mock getSignedDownloadUrl - returns predictable mock URL.
		 */
		getSignedDownloadUrl: async (
			key: string,
			expiresIn: number = 3600
		): Promise<string> => {
			calls.getSignedUrl.push({ key, expiresIn });
			checkAndThrowError();

			if (getSignedUrlOverride) {
				return getSignedUrlOverride(key, expiresIn);
			}

			return `https://mock-r2.test/${key}?expires=${expiresIn}&sig=mock-signature`;
		},

		/**
		 * Generate file key - uses real implementation (no external deps).
		 */
		generateFileKey: (
			organizationId: string,
			userId: string,
			originalFilename: string
		): string => {
			calls.generateKey.push({ organizationId, userId, originalFilename });

			const timestamp = Date.now();
			const sanitizedName = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
			return `${organizationId}/${userId}/${timestamp}_${sanitizedName}`;
		},

		// ========== Test Utilities ==========

		/** Get all recorded calls for assertions */
		getCalls: () => ({
			upload: [...calls.upload],
			delete: [...calls.delete],
			getSignedUrl: [...calls.getSignedUrl],
			generateKey: [...calls.generateKey]
		}),

		/** Clear recorded calls */
		clearCalls: () => {
			calls.upload = [];
			calls.delete = [];
			calls.getSignedUrl = [];
			calls.generateKey = [];
		},

		/** Get a copy of all stored files */
		getStoredFiles: () => new Map(storage),

		/** Get a specific stored file by key */
		getStoredFile: (key: string) => storage.get(key),

		/** Check if a file exists in storage */
		hasFile: (key: string) => storage.has(key),

		/** Reset all state (storage and calls) */
		clear: () => {
			storage.clear();
			calls.upload = [];
			calls.delete = [];
			calls.getSignedUrl = [];
			calls.generateKey = [];
			uploadOverride = null;
			deleteOverride = null;
			getSignedUrlOverride = null;
			nextError = null;
		},

		/**
		 * Override uploadFile for specific test scenarios.
		 * Pass null to clear override.
		 */
		setUploadOverride: (
			fn:
				| ((
						key: string,
						file: Buffer | Uint8Array,
						contentType: string,
						metadata?: Record<string, string>
				  ) => Promise<void>)
				| null
		) => {
			uploadOverride = fn;
		},

		/**
		 * Override deleteFile for specific test scenarios.
		 * Pass null to clear override.
		 */
		setDeleteOverride: (fn: ((key: string) => Promise<void>) | null) => {
			deleteOverride = fn;
		},

		/**
		 * Override getSignedDownloadUrl for specific test scenarios.
		 * Pass null to clear override.
		 */
		setGetSignedUrlOverride: (
			fn: ((key: string, expiresIn: number) => Promise<string>) | null
		) => {
			getSignedUrlOverride = fn;
		},

		/**
		 * Inject an error for the next operation (one-shot).
		 * Error is cleared after being thrown.
		 */
		setNextError: (error: Error | null) => {
			nextError = error;
		}
	};
}

// ============================================================================
// SQS Service Mock
// ============================================================================

type QueuedMessage = {
	queueUrl: string;
	body: unknown;
};

/**
 * Mock for SQS client (used by OptimizationService).
 * Captures queued messages for test assertions.
 *
 * @example
 * ```ts
 * import { OptimizationService } from '$lib/services/server/optimization.service';
 *
 * const mockSqs = createMockSqsService();
 * const service = new OptimizationService(mockSqs);
 *
 * await service.queueOptimization(mapId, orgId, options);
 *
 * expect(mockSqs.messages).toHaveLength(1);
 * expect(mockSqs.messages[0].body).toMatchObject({
 *   job_id: expect.any(String),
 *   matrix: expect.any(Array)
 * });
 * ```
 */
export function createMockSqsService() {
	const messages: QueuedMessage[] = [];

	return {
		/** Array of captured queued messages */
		messages,

		/** Clear captured messages (call in beforeEach) */
		clear: () => {
			messages.length = 0;
		},

		/** Mock send method matching SQSClient interface */
		send: vi.fn().mockImplementation((command: { input: { QueueUrl?: string; MessageBody?: string } }) => {
			const input = command.input;
			messages.push({
				queueUrl: input.QueueUrl ?? '',
				body: JSON.parse(input.MessageBody ?? '{}')
			});
			return Promise.resolve({ MessageId: `mock-${messages.length}` });
		})
	};
}
