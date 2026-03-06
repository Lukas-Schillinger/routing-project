/**
 * Dev-only endpoint to provision a pre-populated account for browser verification.
 *
 * POST /api/dev/provision
 *
 * Creates a fresh org seeded with fixture data (locations, drivers, maps, stops,
 * routes, etc.) and auto-logs in by setting the session cookie.
 *
 * Returns: { email, redirectUrl }
 */
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import {
	createSession,
	generateSessionToken,
	setSessionTokenCookie
} from '$lib/services/server/auth';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fixture from '$lib/testing/data/dev-fixture.json';

export const POST: RequestHandler = async (event) => {
	if (!import.meta.env.DEV) {
		error(404);
	}

	const timestamp = Date.now();
	const email = `dev-${timestamp}@test.local`;

	// 1. Create organization
	const [org] = await db
		.insert(schema.organizations)
		.values({ name: `Dev Account ${new Date().toLocaleDateString()}` })
		.returning();

	const orgId = org.id;

	// 2. Create admin user
	const [user] = await db
		.insert(schema.users)
		.values({
			organization_id: orgId,
			email,
			name: 'Dev User',
			role: 'admin',
			email_confirmed_at: new Date()
		})
		.returning();

	// 3. Insert locations
	const locationIds: string[] = [];
	for (const loc of fixture.locations) {
		const [row] = await db
			.insert(schema.locations)
			.values({
				organization_id: orgId,
				address_line_1: loc.address_line_1,
				address_line_2: loc.address_line_2,
				address_number: loc.address_number,
				street_name: loc.street_name,
				city: loc.city,
				region: loc.region,
				postal_code: loc.postal_code,
				country: loc.country,
				lat: loc.lat,
				lon: loc.lon,
				geocode_raw: loc.geocode_raw,
				geocode_confidence: loc.geocode_confidence as
					| 'exact'
					| 'high'
					| 'medium'
					| 'low',
				geocode_provider: loc.geocode_provider,
				created_by: user.id
			})
			.returning({ id: schema.locations.id });
		locationIds.push(row.id);
	}

	// 4. Insert drivers
	const driverIds: string[] = [];
	for (const d of fixture.drivers) {
		const [row] = await db
			.insert(schema.drivers)
			.values({
				organization_id: orgId,
				name: d.name,
				phone: d.phone,
				color: d.color,
				active: d.active,
				temporary: d.temporary,
				created_by: user.id
			})
			.returning({ id: schema.drivers.id });
		driverIds.push(row.id);
	}

	// 5. Insert depots
	const depotIds: string[] = [];
	for (const d of fixture.depots) {
		const locationId =
			d.locationIndex != null ? locationIds[d.locationIndex] : null;
		if (!locationId) continue;
		const [row] = await db
			.insert(schema.depots)
			.values({
				organization_id: orgId,
				location_id: locationId,
				name: d.name,
				default_depot: d.default_depot,
				created_by: user.id
			})
			.returning({ id: schema.depots.id });
		depotIds.push(row.id);
	}

	// 6. Insert maps
	const mapIds: string[] = [];
	for (const m of fixture.maps) {
		const depotId =
			m.depotIndex != null ? (depotIds[m.depotIndex] ?? null) : null;
		const [row] = await db
			.insert(schema.maps)
			.values({
				organization_id: orgId,
				title: m.title,
				depot_id: depotId,
				created_by: user.id
			})
			.returning({ id: schema.maps.id });
		mapIds.push(row.id);
	}

	// 7. Insert stops
	for (const s of fixture.stops) {
		const mapId = s.mapIndex != null ? mapIds[s.mapIndex] : null;
		const locationId =
			s.locationIndex != null ? locationIds[s.locationIndex] : null;
		const driverId =
			s.driverIndex != null ? (driverIds[s.driverIndex] ?? null) : null;
		if (!mapId || !locationId) continue;
		await db.insert(schema.stops).values({
			organization_id: orgId,
			map_id: mapId,
			location_id: locationId,
			driver_id: driverId,
			contact_name: s.contact_name,
			contact_phone: s.contact_phone,
			notes: s.notes,
			delivery_index: s.delivery_index,
			created_by: user.id
		});
	}

	// 8. Insert driver-map memberships
	for (const m of fixture.memberships) {
		const driverId =
			m.driverIndex != null ? (driverIds[m.driverIndex] ?? null) : null;
		const mapId = m.mapIndex != null ? (mapIds[m.mapIndex] ?? null) : null;
		if (!driverId || !mapId) continue;
		await db.insert(schema.driverMapMemberships).values({
			organization_id: orgId,
			driver_id: driverId,
			map_id: mapId
		});
	}

	// 9. Insert matrices
	const matrixIds: string[] = [];
	for (const m of fixture.matrices) {
		const mapId = m.mapIndex != null ? (mapIds[m.mapIndex] ?? null) : null;
		if (!mapId) continue;
		const [row] = await db
			.insert(schema.matrices)
			.values({
				organization_id: orgId,
				map_id: mapId,
				inputs_hash: m.inputs_hash,
				matrix: m.matrix as number[][]
			})
			.returning({ id: schema.matrices.id });
		matrixIds.push(row.id);
	}

	// 10. Insert routes
	for (const r of fixture.routes) {
		const mapId = r.mapIndex != null ? (mapIds[r.mapIndex] ?? null) : null;
		const driverId =
			r.driverIndex != null ? (driverIds[r.driverIndex] ?? null) : null;
		const depotId =
			r.depotIndex != null ? (depotIds[r.depotIndex] ?? null) : null;
		if (!mapId || !driverId || !depotId) continue;
		await db.insert(schema.routes).values({
			organization_id: orgId,
			map_id: mapId,
			driver_id: driverId,
			depot_id: depotId,
			geometry: r.geometry as { type: string; coordinates: number[][] },
			duration: String(r.duration)
		});
	}

	// 11. Create session and set cookie
	const token = generateSessionToken();
	const session = await createSession(token, user.id);
	setSessionTokenCookie(event, token, session.expires_at);

	return json({
		email,
		redirectUrl: '/maps',
		organizationId: orgId,
		summary: {
			locations: locationIds.length,
			drivers: driverIds.length,
			depots: depotIds.length,
			maps: mapIds.length,
			stops: fixture.stops.length,
			memberships: fixture.memberships.length,
			matrices: matrixIds.length,
			routes: fixture.routes.length
		}
	});
};
