/**
 * Export dev fixture data from an existing org.
 *
 * Usage: npx tsx src/lib/testing/data/export-dev-fixture.ts [orgId]
 *
 * Exports locations, drivers, depots, maps, stops, driver-map memberships,
 * matrices, and routes. Foreign keys are stored as array indices so they
 * can be remapped when seeding a new org.
 */
import 'dotenv/config';
import postgres from 'postgres';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const ORG_ID = process.argv[2] ?? 'ac53d14a-58d1-4f8c-b351-b09419ed811c';
const OUT_PATH = resolve(import.meta.dirname!, 'dev-fixture.json');

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
	console.log(`Exporting fixture data for org ${ORG_ID}...`);

	// 1. Locations (the expensive geocoded data we want to preserve)
	const locations = await sql`
		SELECT address_line_1, address_line_2, address_number, street_name,
			city, region, postal_code, country, lat, lon,
			geocode_raw, geocode_confidence, geocode_provider
		FROM locations WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	console.log(`  ${locations.length} locations`);

	// Build location ID → index map
	const locationRows = await sql`
		SELECT id FROM locations WHERE organization_id = ${ORG_ID} ORDER BY created_at
	`;
	const locationIdToIndex = new Map(locationRows.map((r, i) => [r.id, i]));

	// 2. Drivers
	const driverRows = await sql`
		SELECT id, name, phone, color, active, temporary
		FROM drivers WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	const driverIdToIndex = new Map(driverRows.map((r, i) => [r.id, i]));
	const drivers = driverRows.map(
		({ name, phone, color, active, temporary }) => ({
			name,
			phone,
			color,
			active,
			temporary
		})
	);
	console.log(`  ${drivers.length} drivers`);

	// 3. Depots
	const depotRows = await sql`
		SELECT id, name, default_depot, location_id
		FROM depots WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	const depotIdToIndex = new Map(depotRows.map((r, i) => [r.id, i]));
	const depots = depotRows.map(({ name, default_depot, location_id }) => ({
		name,
		default_depot,
		locationIndex: locationIdToIndex.get(location_id) ?? null
	}));
	console.log(`  ${depots.length} depots`);

	// 4. Maps
	const mapRows = await sql`
		SELECT id, title, depot_id
		FROM maps WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	const mapIdToIndex = new Map(mapRows.map((r, i) => [r.id, i]));
	const maps = mapRows.map(({ title, depot_id }) => ({
		title,
		depotIndex: depot_id ? (depotIdToIndex.get(depot_id) ?? null) : null
	}));
	console.log(`  ${maps.length} maps`);

	// 5. Stops
	const stopRows = await sql`
		SELECT map_id, location_id, driver_id, contact_name, contact_phone, notes, delivery_index
		FROM stops WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	const stops = stopRows.map(({ map_id, location_id, driver_id, ...rest }) => ({
		...rest,
		mapIndex: mapIdToIndex.get(map_id) ?? null,
		locationIndex: locationIdToIndex.get(location_id) ?? null,
		driverIndex: driver_id ? (driverIdToIndex.get(driver_id) ?? null) : null
	}));
	console.log(`  ${stops.length} stops`);

	// 6. Driver-Map Memberships
	const membershipRows = await sql`
		SELECT driver_id, map_id
		FROM driver_map_memberships WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	const memberships = membershipRows.map(({ driver_id, map_id }) => ({
		driverIndex: driverIdToIndex.get(driver_id) ?? null,
		mapIndex: mapIdToIndex.get(map_id) ?? null
	}));
	console.log(`  ${memberships.length} memberships`);

	// 7. Matrices
	const matrixRows = await sql`
		SELECT map_id, inputs_hash, matrix
		FROM matrices WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	const matrices = matrixRows.map(({ map_id, inputs_hash, matrix }) => ({
		matrix,
		inputsHash: inputs_hash,
		mapIndex: mapIdToIndex.get(map_id) ?? null
	}));
	console.log(`  ${matrices.length} matrices`);

	// 8. Routes
	const routeRows = await sql`
		SELECT map_id, driver_id, depot_id, geometry, duration
		FROM routes WHERE organization_id = ${ORG_ID}
		ORDER BY created_at
	`;
	const routes = routeRows.map(({ map_id, driver_id, depot_id, ...rest }) => ({
		...rest,
		mapIndex: mapIdToIndex.get(map_id) ?? null,
		driverIndex: driverIdToIndex.get(driver_id) ?? null,
		depotIndex: depotIdToIndex.get(depot_id) ?? null
	}));
	console.log(`  ${routes.length} routes`);

	const fixture = {
		_exportedAt: new Date().toISOString(),
		_sourceOrgId: ORG_ID,
		locations,
		drivers,
		depots,
		maps,
		stops,
		memberships,
		matrices,
		routes
	};

	writeFileSync(OUT_PATH, JSON.stringify(fixture, null, '\t'));
	console.log(`\nFixture written to ${OUT_PATH}`);

	await sql.end();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
