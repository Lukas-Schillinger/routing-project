import { csvImportService, ServiceError } from '$lib/services/server';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const formData = await request.formData();
	const file = formData.get('csvFile') as File;
	const mapTitle = (formData.get('mapTitle') as string) || null;

	if (!file) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	try {
		const result = await csvImportService.importCSV(file, mapTitle, user.organization_id);

		return json({
			success: true,
			...result
		});
	} catch (error) {
		console.error('CSV upload error:', error);

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json(
			{
				error: error instanceof Error ? error.message : 'Failed to process CSV file'
			},
			{ status: 500 }
		);
	}
};
