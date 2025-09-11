import { fail } from '@sveltejs/kit';
import Papa from 'papaparse';
import type { Actions } from './$types';

export const actions: Actions = {
	upload: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('csvFile') as File;

		if (!file || file.name === '') {
			return fail(400, { error: 'No file uploaded' });
		}

		// Check if it's a CSV file
		if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
			return fail(400, { error: 'Please upload a CSV file' });
		}

		// Check file size (limit to 5MB)
		if (file.size > 5 * 1024 * 1024) {
			return fail(400, { error: 'File size must be less than 5MB' });
		}

		try {
			// Convert file to text
			const text = await file.text();

			// Parse CSV with Papaparse
			const parseResult = Papa.parse(text, {
				header: true,
				skipEmptyLines: true,
				transformHeader: (header: string) => header.trim().toLowerCase()
			});

			if (parseResult.errors.length > 0) {
				return fail(400, {
					error: 'CSV parsing error: ' + parseResult.errors[0].message
				});
			}

			const data = parseResult.data as Record<string, string>[];

			// Check if file is empty
			if (data.length === 0) {
				return fail(400, { error: 'CSV file is empty' });
			}

			// Validate required columns
			const requiredColumns = ['name', 'address', 'phone number', 'notes'];
			const headers = Object.keys(data[0]);

			// Check if all required columns exist
			const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
			if (missingColumns.length > 0) {
				return fail(400, {
					error: `Missing required columns: ${missingColumns.join(', ')}. Expected format: "name, address, phone number, notes"`
				});
			}

			// Validate and clean the data
			const validatedData = data.map((row, index) => {
				const cleanRow = {
					name: row.name?.trim() || '',
					address: row.address?.trim() || '',
					phoneNumber: row['phone number']?.trim() || '',
					notes: row.notes?.trim() || ''
				};

				// Check if name is provided (required field)
				if (!cleanRow.name) {
					throw new Error(`Row ${index + 1}: Name is required`);
				}

				// Basic phone number validation (optional, but if provided should be reasonable)
				if (cleanRow.phoneNumber && !/^[\d\s\-()+.]{7,}$/.test(cleanRow.phoneNumber)) {
					throw new Error(`Row ${index + 1}: Invalid phone number format`);
				}

				return cleanRow;
			});

			return {
				success: true,
				data: validatedData,
				count: validatedData.length,
				fileName: file.name
			};
		} catch (error) {
			console.error('CSV processing error:', error);
			return fail(400, {
				error: error instanceof Error ? error.message : 'Failed to process CSV file'
			});
		}
	}
};
