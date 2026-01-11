import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	throw new Error('Test server error from API endpoint');
};
