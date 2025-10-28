import type { Location, LocationCreate, LocationUpdate } from '$lib/schemas/location';
import { db } from '$lib/server/db';
import { locations } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export class LocationService {
	/**
	 * Verify a location exists and belongs to the organization
	 */
	async verifyLocationOwnership(locationId: string, organizationId: string): Promise<Location> {
		const [location] = await db
			.select()
			.from(locations)
			.where(eq(locations.id, locationId))
			.limit(1);

		if (!location) {
			throw ServiceError.notFound('Location not found');
		}

		if (location.organization_id !== organizationId) {
			throw ServiceError.forbidden('Location does not belong to your organization');
		}

		return location;
	}

	/**
	 * Get all locations for an organization
	 */
	async getLocations(organizationId: string): Promise<Location[]> {
		return db
			.select()
			.from(locations)
			.where(eq(locations.organization_id, organizationId))
			.orderBy(locations.name);
	}

	/**
	 * Get a specific location by ID
	 */
	async getLocationById(locationId: string, organizationId: string): Promise<Location> {
		return this.verifyLocationOwnership(locationId, organizationId);
	}

	/**
	 * Create a location from the provided data
	 */
	async createLocation(locationData: LocationCreate, organizationId: string): Promise<Location> {
		const [newLocation] = await db
			.insert(locations)
			.values({
				organization_id: organizationId,
				name: locationData.name || null,
				address_line1: locationData.address_line1,
				address_line2: locationData.address_line2 || null,
				city: locationData.city || null,
				region: locationData.region || null,
				postal_code: locationData.postal_code || null,
				country: locationData.country || 'US',
				lat: locationData.lat || null,
				lon: locationData.lon || null,
				geocode_provider: locationData.geocode_provider || null,
				geocode_confidence: locationData.geocode_confidence || null,
				geocode_place_id: locationData.geocode_place_id || null,
				geocode_raw: locationData.geocode_raw || null,
				address_hash: locationData.address_hash || null
			})
			.returning();

		return newLocation;
	}

	/**
	 * Create or verify a location
	 * If location data is provided, creates a new location
	 * If location_id is provided, verifies it belongs to the organization
	 * Returns the location ID
	 */
	async createOrVerifyLocation(
		locationId: string | undefined,
		locationData: LocationCreate | undefined,
		organizationId: string
	): Promise<string> {
		if (locationData && !locationId) {
			// Create new location
			const newLocation = await this.createLocation(locationData, organizationId);
			return newLocation.id;
		} else if (locationId) {
			// Verify existing location
			await this.verifyLocationOwnership(locationId, organizationId);
			return locationId;
		} else {
			throw ServiceError.validation('Either location_id or location data must be provided');
		}
	}

	/**
	 * Update a location
	 */
	async updateLocation(
		locationId: string,
		data: LocationUpdate,
		organizationId: string
	): Promise<Location> {
		// Verify location ownership
		await this.verifyLocationOwnership(locationId, organizationId);

		// Update location
		const [updatedLocation] = await db
			.update(locations)
			.set({
				name: data.name,
				address_line1: data.address_line1,
				address_line2: data.address_line2,
				city: data.city,
				region: data.region,
				postal_code: data.postal_code,
				country: data.country,
				lat: data.lat,
				lon: data.lon,
				geocode_provider: data.geocode_provider,
				geocode_confidence: data.geocode_confidence,
				geocode_place_id: data.geocode_place_id,
				geocode_raw: data.geocode_raw,
				address_hash: data.address_hash,
				updated_at: new Date()
			})
			.where(eq(locations.id, locationId))
			.returning();

		return updatedLocation;
	}

	/**
	 * Get a location by address hash
	 * Used to find existing locations with the same address
	 */
	async getLocationByHash(hash: string, organizationId: string): Promise<Location | null> {
		const [location] = await db
			.select()
			.from(locations)
			.where(and(eq(locations.address_hash, hash), eq(locations.organization_id, organizationId)))
			.limit(1);

		return location || null;
	}

	/**
	 * Delete a location
	 */
	async deleteLocation(locationId: string, organizationId: string): Promise<{ success: boolean }> {
		// Verify location ownership
		await this.verifyLocationOwnership(locationId, organizationId);

		await db.delete(locations).where(eq(locations.id, locationId));

		return { success: true };
	}
}

// Singleton instance
export const locationService = new LocationService();
