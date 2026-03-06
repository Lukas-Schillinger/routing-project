import type { Location, LocationCreate } from '$lib/schemas/location';
import { db } from '$lib/server/db';
import { locations } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { ServiceError } from './errors';

export class LocationService {
	/**
	 * Get a specific location by ID
	 */
	async getLocationById(
		locationId: string,
		organizationId: string
	): Promise<Location> {
		const [location] = await db
			.select()
			.from(locations)
			.where(
				and(
					eq(locations.id, locationId),
					eq(locations.organization_id, organizationId)
				)
			)
			.limit(1);

		if (!location) {
			throw ServiceError.notFound('Location not found');
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
			.orderBy(desc(locations.updated_at));
	}

	/**
	 * Create a location from the provided data
	 */
	async createLocation(
		locationData: LocationCreate,
		organizationId: string,
		userId: string
	): Promise<Location> {
		const [newLocation] = await db
			.insert(locations)
			.values({
				...locationData,
				organization_id: organizationId,
				created_by: userId,
				updated_by: userId
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
		organizationId: string,
		userId: string
	): Promise<string> {
		if (locationData && locationId) {
			throw ServiceError.validation(
				'Provide either location_id OR location data, not both'
			);
		}

		if (locationData) {
			// Create new location
			const newLocation = await this.createLocation(
				locationData,
				organizationId,
				userId
			);
			return newLocation.id;
		} else if (locationId) {
			// Verify existing location
			await this.getLocationById(locationId, organizationId);
			return locationId;
		} else {
			throw ServiceError.validation(
				'Either location_id or location data must be provided'
			);
		}
	}

	/**
	 * Get a location by address hash
	 * Used to find existing locations with the same address
	 */
	async getLocationByHash(
		hash: string,
		organizationId: string
	): Promise<Location | null> {
		const [location] = await db
			.select()
			.from(locations)
			.where(
				and(
					eq(locations.address_hash, hash),
					eq(locations.organization_id, organizationId)
				)
			)
			.limit(1);

		return location ?? null;
	}

	/**
	 * Delete a location
	 */
	async deleteLocation(
		locationId: string,
		organizationId: string
	): Promise<{ success: true }> {
		await this.getLocationById(locationId, organizationId);

		await db
			.delete(locations)
			.where(
				and(
					eq(locations.id, locationId),
					eq(locations.organization_id, organizationId)
				)
			);

		return { success: true };
	}
}

// Singleton instance
export const locationService = new LocationService();
