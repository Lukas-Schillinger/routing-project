/**
 * Google Maps external service for generating directions URLs
 */

export type GoogleMapsDirectionsOptions = {
	destination: {
		lat: number;
		lng: number;
		address?: string;
	};
};

export class GoogleMapsService {
	/**
	 * Generates Google Maps web URL for directions from current location to destination
	 * The web URL will automatically redirect to the app if available
	 */
	static getDirectionsUrl(options: GoogleMapsDirectionsOptions): string {
		const { destination } = options;

		// Google Maps web URL - automatically redirects to app if available
		return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
	}
}

export const googleMapsService = new GoogleMapsService();
