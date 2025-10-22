// src/lib/server/db/schema.ts
import { relations } from 'drizzle-orm';
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';

const id = uuid('id').defaultRandom().primaryKey();
const orgId = uuid('organization_id').defaultRandom().notNull();
const ts = (c: string) => timestamp(c, { withTimezone: true }).defaultNow().notNull();

export const organizations = pgTable('organizations', {
	id,
	name: varchar('name', { length: 200 }).notNull(),
	created_at: ts('created_at'),
	updated_at: ts('updated_at')
});

export const users = pgTable(
	'users',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		email: text('email').notNull().unique(),
		passwordHash: text('password_hash').notNull(),
		role: varchar('role', { length: 32 }).default('member').notNull(),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		uniqueIndex('profiles_user_org_uidx').on(t.organization_id, t.id),
		index('profiles_org_idx').on(t.organization_id)
	]
);

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	user_id: uuid().references(() => users.id, { onDelete: 'cascade' }),
	expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	created_at: ts('created_at'),
	updated_at: ts('updated_at')
});

export const drivers = pgTable(
	'drivers',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 200 }).notNull(),
		phone: varchar('phone', { length: 32 }),
		notes: text('notes'),
		active: boolean('active').default(true).notNull(),
		temporary: boolean('temporary').default(false).notNull(),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [index('drivers_org_idx').on(t.organization_id)]
);

export const maps = pgTable(
	'maps',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 200 }).notNull(),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [index('maps_org_idx').on(t.organization_id)]
);

export const locations = pgTable(
	'locations',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 200 }),
		address_line1: varchar('address_line1', { length: 240 }).notNull(),
		address_line2: varchar('address_line2', { length: 240 }),
		city: varchar('city', { length: 120 }),
		region: varchar('region', { length: 120 }),
		postal_code: varchar('postal_code', { length: 40 }),
		country: varchar('country', { length: 2 }).default('US').notNull(),
		lat: numeric('lat', { precision: 10, scale: 6 }),
		lon: numeric('lon', { precision: 10, scale: 6 }),
		geocode_provider: varchar('geocode_provider', { length: 40 }),
		geocode_confidence: numeric('geocode_confidence', { precision: 5, scale: 2 }),
		geocode_place_id: varchar('geocode_place_id', { length: 120 }),
		geocode_raw: jsonb('geocode_raw'),
		address_hash: varchar('address_hash', { length: 64 }),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		index('locations_org_idx').on(t.organization_id),
		index('locations_geo_idx').on(t.lat, t.lon),
		index('locations_addr_hash_idx').on(t.organization_id, t.address_hash)
	]
);

export const stops = pgTable(
	'stops',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		map_id: uuid('map_id')
			.references(() => maps.id, { onDelete: 'cascade' })
			.notNull(),
		location_id: uuid('location_id')
			.references(() => locations.id, { onDelete: 'restrict' })
			.notNull(),
		external_ref: varchar('external_ref', { length: 120 }),
		contact_name: varchar('contact_name', { length: 200 }),
		contact_phone: varchar('contact_phone', { length: 32 }),
		notes: text('notes'),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		index('stops_org_idx').on(t.organization_id),
		index('stops_map_idx').on(t.map_id),
		index('stops_location_idx').on(t.location_id)
	]
);

export const routes = pgTable(
	'routes',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		map_id: uuid('map_id')
			.references(() => maps.id, { onDelete: 'cascade' })
			.notNull(),
		driver_id: uuid('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
		total_distance_m: integer('total_distance_m').default(0).notNull(),
		total_duration_s: integer('total_duration_s').default(0).notNull(),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		index('routes_org_idx').on(t.organization_id),
		index('routes_map_idx').on(t.map_id),
		index('routes_driver_idx').on(t.driver_id)
	]
);

export const routeStops = pgTable(
	'route_stops',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		route_id: uuid('route_id')
			.references(() => routes.id, { onDelete: 'cascade' })
			.notNull(),
		stop_id: uuid('stop_id')
			.references(() => stops.id, { onDelete: 'cascade' })
			.notNull(),
		sequence: integer('sequence').notNull(),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		uniqueIndex('route_stops_route_seq_uidx').on(t.route_id, t.sequence),
		uniqueIndex('route_stops_route_stop_uidx').on(t.route_id, t.stop_id),
		index('route_stops_route_idx').on(t.route_id)
	]
);

export const fileUploads = pgTable(
	'file_uploads',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		map_id: uuid('map_id').references(() => maps.id, { onDelete: 'cascade' }),
		filename: varchar('filename', { length: 240 }).notNull(),
		byte_size: integer('byte_size').notNull(),
		column_map: jsonb('column_map').$type<Record<string, string>>().default({}),
		storage_path: varchar('storage_path', { length: 400 }),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		index('file_uploads_org_idx').on(t.organization_id),
		index('file_uploads_map_idx').on(t.map_id)
	]
);

/***************************************************************************************
 *
 * 									Relations
 *
 **************************************************************************************/

export const organizationsRelations = relations(organizations, ({ many }) => ({
	profiles: many(users),
	drivers: many(drivers),
	maps: many(maps),
	locations: many(locations),
	stops: many(stops),
	routes: many(routes),
	routeStops: many(routeStops),
	fileUploads: many(fileUploads)
}));

export const profilesRelations = relations(users, ({ one }) => ({
	organization: one(organizations, {
		fields: [users.organization_id],
		references: [organizations.id]
	})
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [drivers.organization_id],
		references: [organizations.id]
	}),
	routes: many(routes)
}));

export const mapsRelations = relations(maps, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [maps.organization_id],
		references: [organizations.id]
	}),
	stops: many(stops),
	routes: many(routes),
	fileUploads: many(fileUploads)
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [locations.organization_id],
		references: [organizations.id]
	}),
	stops: many(stops)
}));

export const stopsRelations = relations(stops, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [stops.organization_id],
		references: [organizations.id]
	}),
	map: one(maps, {
		fields: [stops.map_id],
		references: [maps.id]
	}),
	location: one(locations, {
		fields: [stops.location_id],
		references: [locations.id]
	}),
	routeStops: many(routeStops)
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [routes.organization_id],
		references: [organizations.id]
	}),
	map: one(maps, {
		fields: [routes.map_id],
		references: [maps.id]
	}),
	driver: one(drivers, {
		fields: [routes.driver_id],
		references: [drivers.id]
	}),
	routeStops: many(routeStops)
}));

export const routeStopsRelations = relations(routeStops, ({ one }) => ({
	organization: one(organizations, {
		fields: [routeStops.organization_id],
		references: [organizations.id]
	}),
	route: one(routes, {
		fields: [routeStops.route_id],
		references: [routes.id]
	}),
	stop: one(stops, {
		fields: [routeStops.stop_id],
		references: [stops.id]
	})
}));

export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
	organization: one(organizations, {
		fields: [fileUploads.organization_id],
		references: [organizations.id]
	}),
	map: one(maps, {
		fields: [fileUploads.map_id],
		references: [maps.id]
	})
}));
