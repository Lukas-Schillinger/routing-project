import { MapboxApiError, mapboxGeocoding } from '$lib/services/external/mapbox';
import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { z } from 'zod';

const addressSchema = z.object({
	address: z
		.string()
		.min(1, 'Address is required')
		.max(500, 'Address is too long')
		.refine((val) => val.trim().length > 0, 'Address cannot be empty')
});

export const load = async () => {
	const form = await superValidate(zod(addressSchema));

	// Set default address for styling purposes
	form.data.address = '5106 Tari';

	return {
		title: 'Mapbox Geocoding Demo',
		form: form
	};
};

export const actions = {
	geocode: async ({ request }) => {
		const form = await superValidate(request, zod(addressSchema));

		if (!form.valid) {
			return fail(400, {
				form
			});
		}

		try {
			const features = await mapboxGeocoding.forward(form.data.address, {
				limit: 5,
				country: 'US'
			});

			return {
				form,
				success: true,
				response: {
					type: 'FeatureCollection' as const,
					features,
					attribution: 'Mapbox'
				}
			};
		} catch (error) {
			console.error('Geocoding error:', error);

			if (error instanceof MapboxApiError) {
				return fail(400, {
					form,
					message: error.message
				});
			}

			return fail(500, {
				form,
				message: 'An unexpected error occurred'
			});
		}
	}
};
