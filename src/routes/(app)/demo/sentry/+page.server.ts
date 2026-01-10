import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Trigger server error during load if requested
	if (url.searchParams.get('error') === 'load') {
		throw new Error('Test server error during page load');
	}

	return {
		timestamp: new Date().toISOString()
	};
};

export const actions: Actions = {
	triggerError: async () => {
		throw new Error('Test server error from form action');
	}
};
