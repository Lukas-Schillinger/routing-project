/**
 * Apple Maps external service for generating directions URLs
 */

export interface AppleMapsDirectionsOptions {
	destination: {
		lat: number;
		lng: number;
		address?: string;
	};
}

export class AppleMapsService {
	/**
	 * Generates Apple Maps web URL for directions from current location to destination
	 * The web URL will automatically redirect to the app if available
	 */
	static getDirectionsUrl(options: AppleMapsDirectionsOptions): string {
		const { destination } = options;

		// Apple Maps web URL - automatically redirects to app if available
		return `https://maps.apple.com/?daddr=${destination.lat},${destination.lng}&dirflg=d`;
	}
}

export const appleMapsService = new AppleMapsService();
