import Papa from 'papaparse';
import { ServiceError } from './errors';
import { mapService } from './map.service';

export interface CSVRecord {
	name: string;
	address: string;
	phone?: string | null;
	notes?: string | null;
}

export interface CSVImportResult {
	mapId: string;
	recordCount: number;
	records: CSVRecord[];
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
		const requiredColumns = ['name', 'address'];
		const headers = Object.keys(records[0] || {});
		const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

		if (missingColumns.length > 0) {
			throw ServiceError.validation(`Missing required columns: ${missingColumns.join(', ')}`);
		}

		// Transform records
		return records.map((r) => ({
			name: r.name,
			address: r.address,
			phone: r.phone || null,
			notes: r.notes || null
		}));
	}

	/**
	 * Import CSV file and create a map with parsed records
	 */
	async importCSV(
		file: File,
		mapTitle: string | null,
		organizationId: string
	): Promise<CSVImportResult> {
		// Parse CSV
		const text = await file.text();
		const records = this.parseCSV(text);

		// Create map
		const title = mapTitle || `Upload ${new Date().toISOString()}`;
		const map = await mapService.createMap({ title }, organizationId);

		return {
			mapId: map.id,
			recordCount: records.length,
			records
		};
	}
}

// Singleton instance
export const csvImportService = new CSVImportService();
