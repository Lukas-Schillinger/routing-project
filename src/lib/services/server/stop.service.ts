import type { CreateStop, Stop, StopFilter, StopWithLocation, UpdateStop } from '$lib/schemas/stop';
import { db } from '$lib/server/db';
import { locations, maps, stops } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { ServiceError } from './errors';
import { locationService } from './location.service';

export class StopService {
	/**
	 * Verify stop ownership
	 */
	private async verifyStopOwnership(stopId: string, organizationId: string) {
		const [stop] = await db.select().from(stops).where(eq(stops.id, stopId)).limit(1);

		if (!stop) {
			throw ServiceError.notFound('Stop not found');
		}

		if (stop.organization_id !== organizationId) {
			throw ServiceError.forbidden('Access denied');
		}

		return stop;
	}

	async getStops(organizationId: string): Promise<Stop[]> {
		const results = await db.select().from(stops).where(eq(stops.organization_id, organizationId));
		return results;
	}

	/**
	 * Get all stops for a map with location details
	 */
	async getStopsByMap(
		mapId: string,
		organizationId: string,
		filter?: StopFilter
	): Promise<StopWithLocation[]> {
		// Verify map ownership first
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		const conditions = filter?.driver_id
			? and(eq(stops.map_id, mapId), eq(stops.driver_id, filter.driver_id))
			: eq(stops.map_id, mapId);

		const results = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(conditions);

		return results;
	}

	/**
	 * Get a single stop with location details
	 */
	async getStopById(stopId: string, organizationId: string): Promise<StopWithLocation> {
		await this.verifyStopOwnership(stopId, organizationId);

		const [result] = await db
			.select({
				stop: stops,
				location: locations
			})
			.from(stops)
			.innerJoin(locations, eq(stops.location_id, locations.id))
			.where(eq(stops.id, stopId))
			.limit(1);

		if (!result) {
			throw ServiceError.notFound('Stop not found');
		}

		return result;
	}

	/**
	 * Create a new stop
	 * Can create location first if location data is provided
	 */
	async createStop(data: CreateStop, organizationId: string): Promise<StopWithLocation> {
		let locationId = data.location_id;

		// Create location if data is provided
		if (data.location && !locationId) {
			const location = await locationService.createLocation(data.location, organizationId);
			locationId = location.id;
		}

		if (!locationId) {
			throw ServiceError.validation('Either location_id or location data must be provided');
		}

		// Verify location ownership
		await locationService.verifyLocationOwnership(locationId, organizationId);

		// Verify map ownership
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, data.map_id), eq(maps.organization_id, organizationId)))
			.limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		const [stop] = await db
			.insert(stops)
			.values({
				organization_id: organizationId,
				map_id: data.map_id,
				location_id: locationId,
				contact_name: data.contact_name || null,
				contact_phone: data.contact_phone || null,
				notes: data.notes || null,
				driver_id: data.driver_id || null,
				delivery_index: data.delivery_index || null
			})
			.returning();

		return this.getStopById(stop.id, organizationId);
	}

	/**
	 * Update a stop
	 */
	async updateStop(
		stopId: string,
		data: UpdateStop,
		organizationId: string
	): Promise<StopWithLocation> {
		const stop = await this.verifyStopOwnership(stopId, organizationId);
		let locationId = stop.location_id;

		// Create new location if data is provided
		if (data.location) {
			const location = await locationService.createLocation(data.location, organizationId);
			locationId = location.id;
		} else if (data.location_id) {
			// Verify ownership if location_id is provided
			await locationService.verifyLocationOwnership(data.location_id, organizationId);
			locationId = data.location_id;
		}

		const updateData: Partial<typeof stops.$inferInsert> & { updated_at: Date } = {
			location_id: locationId,
			driver_id: data.driver_id !== undefined ? data.driver_id : stop.driver_id,
			delivery_index: data.delivery_index !== undefined ? data.delivery_index : stop.delivery_index,
			contact_name: data.contact_name !== undefined ? data.contact_name : stop.contact_name,
			contact_phone: data.contact_phone !== undefined ? data.contact_phone : stop.contact_phone,
			notes: data.notes !== undefined ? data.notes : stop.notes,
			updated_at: new Date()
		};

		const [updatedStop] = await db
			.update(stops)
			.set(updateData)
			.where(eq(stops.id, stopId))
			.returning();

		return this.getStopById(updatedStop.id, organizationId);
	}

	/**
	 * Delete a stop
	 */
	async deleteStop(stopId: string, organizationId: string): Promise<{ success: boolean }> {
		await this.verifyStopOwnership(stopId, organizationId);

		await db.delete(stops).where(eq(stops.id, stopId));

		return { success: true };
	}

	/**
	 * Bulk create stops (used by geocode endpoint)
	 */
	async bulkCreateStops(
		stopsData: Array<{
			location_id: string;
			contact_name?: string | null;
			contact_phone?: string | null;
			notes?: string | null;
		}>,
		mapId: string,
		organizationId: string
	) {
		// Verify map ownership
		const [map] = await db
			.select()
			.from(maps)
			.where(and(eq(maps.id, mapId), eq(maps.organization_id, organizationId)))
			.limit(1);

		if (!map) {
			throw ServiceError.notFound('Map not found');
		}

		const values = stopsData.map((data) => ({
			organization_id: organizationId,
			map_id: mapId,
			location_id: data.location_id,
			contact_name: data.contact_name || null,
			contact_phone: data.contact_phone || null,
			notes: data.notes || null
		}));

		const createdStops = await db.insert(stops).values(values).returning();

		return createdStops;
	}
}

// Singleton instance
export const stopService = new StopService();
