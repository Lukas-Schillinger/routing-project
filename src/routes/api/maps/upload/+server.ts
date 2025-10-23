import { db } from '$lib/server/db';
import { maps } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import Papa from 'papaparse';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get('csvFile') as File;
	const mapTitle = formData.get('mapTitle') as string;

	if (!file) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	try {
		// Parse CSV
		const text = await file.text();
		const parseResult = Papa.parse(text, {
			header: true,
			skipEmptyLines: true,
			transformHeader: (header) => header.trim()
		});

		if (parseResult.errors.length > 0) {
			return json(
				{ error: `CSV parsing errors: ${parseResult.errors.map((e) => e.message).join(', ')}` },
				{ status: 400 }
			);
		}

		const records = parseResult.data as Record<string, string>[];

		if (records.length === 0) {
			return json({ error: 'CSV file is empty' }, { status: 400 });
		}

		// Validate required columns
		const requiredColumns = ['name', 'address'];
		const headers = Object.keys(records[0] || {});
		const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

		if (missingColumns.length > 0) {
			return json(
				{ error: `Missing required columns: ${missingColumns.join(', ')}` },
				{ status: 400 }
			);
		}

		// Create map
		const [map] = await db
			.insert(maps)
			.values({
				organization_id: user.organization_id,
				title: mapTitle || `Upload ${new Date().toISOString()}`
			})
			.returning();

		return json({
			success: true,
			mapId: map.id,
			recordCount: records.length,
			records: records.map((r: Record<string, string>) => ({
				name: r.name,
				address: r.address,
				phone: r.phone || null,
				notes: r.notes || null
			}))
		});
	} catch (error) {
		console.error('CSV upload error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to process CSV file'
			},
			{ status: 500 }
		);
	}
};
