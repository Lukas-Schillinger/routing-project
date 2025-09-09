import { MapboxApiError } from '$lib/services/mapbox-client.js';
import { geocodingService } from '$lib/services/mapbox-geocoding.js';
import { fail } from '@sveltejs/kit';
import { z } from 'zod';

const addressSchema = z.object({
	address: z.string().min(1, 'Address is required')
});

export const load = async () => {
	return {
		title: 'Mapbox Geocoding Demo'
	};
};

export const actions = {
	geocode: async ({ request }: { request: Request }) => {
		const formData = await request.formData();
		const result = addressSchema.safeParse({
			address: formData.get('address')
		});

		if (!result.success) {
			return fail(400, {
				errors: result.error.flatten().fieldErrors,
				address: formData.get('address')?.toString()
			});
		}

		try {
			const response = await geocodingService.geocode(result.data.address, {
				limit: 5,
				country: 'us'
			});

			return {
				success: true,
				response,
				address: result.data.address
			};
		} catch (error) {
			console.error('Geocoding error:', error);

			if (error instanceof MapboxApiError) {
				return fail(400, {
					errors: { general: [error.message] },
					address: result.data.address
				});
			}

			return fail(500, {
				errors: { general: ['An unexpected error occurred'] },
				address: result.data.address
			});
		}
	}
};
