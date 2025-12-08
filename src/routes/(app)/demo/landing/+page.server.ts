import { routeService, stopService } from '$lib/services/server';
import { getUserOrRedirect } from '$lib/services/server/auth';
import { writeFileSync } from 'fs';
import type { PageServerLoad } from './$types';

export const load = (async () => {
	const user = getUserOrRedirect();

	const route = await routeService.getRouteById(
		'f256ad05-90a0-4f99-a030-1251379aa18d',
		user.organization_id
	);
	const stops = await stopService.getStopsByMap(
		'd6cc4875-2adb-4530-9ba1-e6b7e13d26ad',
		user.organization_id
	);

	const filteredStops = stops.filter(
		(e) => e.stop.driver_id == 'e1d54d4b-f9ae-4304-8da8-6e09cecc4d2f'
	);

	// Save to JSON file (remove this after saving)
	writeFileSync(
		'src/routes/(app)/demo/landing/landing-data.json',
		JSON.stringify({ route, stops: filteredStops }, null, 2)
	);
	console.log('Data saved to landing-data.json');

	return {
		route: route,
		stops: filteredStops
	};
}) satisfies PageServerLoad;
