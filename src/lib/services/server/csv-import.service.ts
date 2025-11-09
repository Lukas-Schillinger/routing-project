import Papa from 'papaparse';
import { mapboxGeocoding, type GeocodingFeature } from '../external/mapbox';
import { ServiceError } from './errors';

export interface CSVRecord {
	name?: string | null;
	address: string;
	phone?: string | null;
	notes?: string | null;
}

export interface CSVImportResult {
	mapId: string;
	recordCount: number;
	records: CSVRecord[];
}

export interface GeocodeCSVResult {
	name?: string | null;
	raw_address: string;
	phone?: string | null;
	notes?: string | null;
	feature?: GeocodingFeature | null;
}

export class CSVImportService {
	/**
	 * Parse and validate CSV file
	 */
	private parseCSV(text: string): CSVRecord[] {
		const parseResult = Papa.parse(text, {
			header: true,
			skipEmptyLines: true,
			transformHeader: (header) => header.trim()
		});

		if (parseResult.errors.length > 0) {
			throw ServiceError.validation(
				`CSV parsing errors: ${parseResult.errors.map((e) => e.message).join(', ')}`
			);
		}

		const records = parseResult.data as Record<string, string>[];

		if (records.length === 0) {
			throw ServiceError.validation('CSV file is empty');
		}

		// Validate required columns
		const requiredColumns = ['address'];
		const headers = Object.keys(records[0] || {});
		const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

		if (missingColumns.length > 0) {
			throw ServiceError.validation(`Missing required columns: ${missingColumns.join(', ')}`);
		}

		// Transform records
		return records.map((r) => ({
			name: r.name || '',
			address: r.address,
			phone: r.phone || null,
			notes: r.notes || null
		}));
	}

	async geocodeCSV(file: File): Promise<GeocodeCSVResult[]> {
		const text = await file.text();
		const records = this.parseCSV(text);

		const geocodeResults = await mapboxGeocoding.batch(records.map((record) => record.address));

		// Combine CSV records with their corresponding geocoding results
		return records.map((record, index): GeocodeCSVResult => {
			const geocodeResponse = geocodeResults[index];

			/* Not sure why but features not of type feature_type="address" | "secondary_address"
			are being returned by the batch geocode API
		 	*/

			// Get the first/best feature from the geocoding response, or null if no results
			const feature = geocodeResponse.features[0] || null;

			return {
				name: record.name,
				raw_address: record.address,
				phone: record.phone,
				notes: record.notes,
				feature
			};
		});
	}
}

// Singleton instance
export const csvImportService = new CSVImportService();
