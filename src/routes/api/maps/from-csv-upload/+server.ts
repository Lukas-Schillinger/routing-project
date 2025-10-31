import { mapService, ServiceError } from '$lib/services/server';
import type { GeocodeCSVResult } from '$lib/services/server/csv-import.service';
import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

const createMapFromCSVSchema = z.object({
	mapName: z.string().min(1, 'Map name is required'),
	geocodeResults: z.array(
		z.object({
			name: z.string(),
			raw_address: z.string(),
			phone: z.string().nullable().optional(),
			notes: z.string().nullable().optional(),
			feature: z.any().nullable() // GeocodingFeature or null
		})
	)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { mapName, geocodeResults } = createMapFromCSVSchema.parse(body);

		const result = await mapService.createMapFromCSVUploadResult(
			mapName,
			geocodeResults as GeocodeCSVResult[],
			user.organization_id
		);

		return json(result, { status: 201 });
	} catch (error) {
		console.error('Create map from CSV error:', error);

		if (error instanceof z.ZodError) {
			return json(
				{
					error: 'Validation error',
					details: error.errors
				},
				{ status: 400 }
			);
		}

		if (error instanceof ServiceError) {
			return json({ error: error.message }, { status: error.statusCode });
		}

		return json({ error: 'Failed to create map from CSV' }, { status: 500 });
	}
};
