import type { DepotCreate, DepotUpdate, DepotWithLocationJoin } from '$lib/schemas/depot';
import { db } from '$lib/server/db';
import { depots, locations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ServiceError } from './errors';
import { locationService } from './location.service';

export class DepotService {
	/**
	 * Unset the current default depot for an organization
	 */
	private async unsetDefaultDepot(organizationId: string) {
		await db
			.update(depots)
			.set({ default_depot: false, updated_at: new Date() })
			.where(eq(depots.organization_id, organizationId));
	}

	/**
	 * Create a new depot with location
	 * Handles location creation, default depot management, and permissions
	 */
	async createDepot(
		data: DepotCreate,
		organizationId: string,
		userId: string
	): Promise<DepotWithLocationJoin> {
		// Create or verify location
		const locationId = await locationService.createOrVerifyLocation(
			data.location_id,
			data.location,
			organizationId
		);

		// Handle default depot logic
		if (data.default_depot) {
			await this.unsetDefaultDepot(organizationId);
		}

		// Create the depot
		const [newDepot] = await db
			.insert(depots)
			.values({
				organization_id: organizationId,
				created_by: userId,
				updated_by: userId,
				location_id: locationId,
				name: data.name.trim(),
				default_depot: data.default_depot
			})
			.returning();

		// Fetch depot with location details
		const [depotWithLocation] = await db
			.select({
				depot: depots,
				location: locations
			})
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(eq(depots.id, newDepot.id));

		return depotWithLocation!;
	}

	/**
	 * Get all depots for an organization
	 */
	async getDepots(organizationId: string): Promise<DepotWithLocationJoin[]> {
		return db
			.select({
				depot: depots,
				location: locations
			})
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(eq(depots.organization_id, organizationId))
			.orderBy(depots.name);
	}

	/**
	 * Get a specific depot by ID
	 */
	async getDepotById(depotId: string, organizationId: string): Promise<DepotWithLocationJoin> {
		const [depot] = await db
			.select({
				depot: depots,
				location: locations
			})
			.from(depots)
			.innerJoin(locations, eq(depots.location_id, locations.id))
			.where(eq(depots.id, depotId))
			.limit(1);

		if (!depot) {
			throw ServiceError.notFound('Depot not found');
		}

		if (depot.depot.organization_id !== organizationId) {
			throw ServiceError.forbidden('Access denied');
		}

		return depot;
	}

	/**
	 * Update a depot
	 */
	async updateDepot(
		depotId: string,
		data: DepotUpdate,
		organizationId: string,
		userId: string
	): Promise<DepotWithLocationJoin> {
		// Verify depot ownership
		const existingDepot = await this.getDepotById(depotId, organizationId);

		// Handle location update if provided
		let locationId = existingDepot.depot.location_id;
		if (data.location_id || data.location) {
			locationId = await locationService.createOrVerifyLocation(
				data.location_id,
				data.location,
				organizationId
			);
		}

		// Handle default depot logic
		if (data.default_depot === true) {
			await this.unsetDefaultDepot(organizationId);
		}

		// Update depot
		const [updatedDepot] = await db
			.update(depots)
			.set({
				name: data.name?.trim(),
				location_id: locationId,
				default_depot: data.default_depot,
				updated_at: new Date(),
				updated_by: userId
			})
			.where(eq(depots.id, depotId))
			.returning();

		// Return with location
		return this.getDepotById(updatedDepot.id, organizationId);
	}

	/**
	 * Delete a depot
	 */
	async deleteDepot(depotId: string, organizationId: string) {
		// Verify depot ownership
		await this.getDepotById(depotId, organizationId);

		await db.delete(depots).where(eq(depots.id, depotId));

		return { success: true };
	}
}

// Singleton instance
export const depotService = new DepotService();
