// src/lib/server/db/schema.ts
import { relations, sql } from 'drizzle-orm';
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
		temporary: boolean('temporary').default(false).notNull(), // Temporary drivers are deleted when removed from a map
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
		geocode_confidence: varchar('geocode_confidence', { length: 20 }).$type<
			'exact' | 'high' | 'medium' | 'low' | null
		>(), // Mapbox v6: 'exact', 'high', 'medium', 'low'
		geocode_place_id: varchar('geocode_place_id'),
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

export const stops = pgTable('stops', {
	id: uuid('id').primaryKey().defaultRandom(),
	organization_id: uuid('organization_id')
		.notNull()
		.references(() => organizations.id, { onDelete: 'cascade' }),
	map_id: uuid('map_id')
		.notNull()
		.references(() => maps.id, { onDelete: 'cascade' }),
	location_id: uuid('location_id')
		.notNull()
		.references(() => locations.id, { onDelete: 'cascade' }),
	driver_id: uuid('driver_id').references(() => drivers.id, { onDelete: 'set null' }),
	delivery_index: integer('delivery_index'),
	contact_name: varchar('contact_name', { length: 200 }),
	contact_phone: varchar('contact_phone', { length: 32 }),
	notes: text('notes'),
	created_at: timestamp('created_at').defaultNow().notNull(),
	updated_at: timestamp('updated_at').defaultNow().notNull()
});

export const depots = pgTable(
	'depots',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		location_id: uuid('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 200 }).notNull(),
		default_depot: boolean('default_depot').default(false).notNull(),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		index('depots_org_idx').on(t.organization_id),
		index('depots_location_idx').on(t.location_id),
		// Partial unique index to ensure only one default depot per organization
		uniqueIndex('depots_org_default_uidx')
			.on(t.organization_id)
			.where(sql`${t.default_depot} = true`)
	]
);

export const driverMapMemberships = pgTable(
	'driver_map_memberships',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		driver_id: uuid('driver_id')
			.notNull()
			.references(() => drivers.id, { onDelete: 'cascade' }),
		map_id: uuid('map_id')
			.notNull()
			.references(() => maps.id, { onDelete: 'cascade' }),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		uniqueIndex('driver_map_membership_uidx').on(t.driver_id, t.map_id),
		index('driver_map_memberships_driver_idx').on(t.driver_id),
		index('driver_map_memberships_map_idx').on(t.map_id),
		index('driver_map_memberships_org_idx').on(t.organization_id)
	]
);

export const routes = pgTable(
	'routes',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		map_id: uuid('map_id')
			.notNull()
			.references(() => maps.id, { onDelete: 'cascade' }),
		driver_id: uuid('driver_id')
			.notNull()
			.references(() => drivers.id, { onDelete: 'cascade' }),
		depot_id: uuid('depot_id')
			.notNull()
			.references(() => depots.id, { onDelete: 'cascade' }),
		geometry: jsonb('geometry').notNull(), // GeoJSON LineString object { type: "LineString", coordinates: [[lon, lat], ...] }
		duration: numeric('duration', { precision: 12, scale: 2 }), // seconds
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		index('routes_map_idx').on(t.map_id),
		index('routes_driver_idx').on(t.driver_id),
		index('routes_org_idx').on(t.organization_id),
		uniqueIndex('routes_map_driver_uidx').on(t.map_id, t.driver_id)
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
	driverMapMemberships: many(driverMapMemberships),
	depots: many(depots),
	routes: many(routes)
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
	mapMemberships: many(driverMapMemberships),
	stops: many(stops),
	routes: many(routes)
}));

export const mapsRelations = relations(maps, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [maps.organization_id],
		references: [organizations.id]
	}),
	stops: many(stops),
	driverMemberships: many(driverMapMemberships),
	routes: many(routes)
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [locations.organization_id],
		references: [organizations.id]
	}),
	stops: many(stops),
	depots: many(depots)
}));

export const stopsRelations = relations(stops, ({ one }) => ({
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
	driver: one(drivers, {
		fields: [stops.driver_id],
		references: [drivers.id]
	})
}));

export const driverMapMembershipsRelations = relations(driverMapMemberships, ({ one }) => ({
	organization: one(organizations, {
		fields: [driverMapMemberships.organization_id],
		references: [organizations.id]
	}),
	driver: one(drivers, {
		fields: [driverMapMemberships.driver_id],
		references: [drivers.id]
	}),
	map: one(maps, {
		fields: [driverMapMemberships.map_id],
		references: [maps.id]
	})
}));

export const depotsRelations = relations(depots, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [depots.organization_id],
		references: [organizations.id]
	}),
	location: one(locations, {
		fields: [depots.location_id],
		references: [locations.id]
	}),
	routes: many(routes)
}));

export const routesRelations = relations(routes, ({ one }) => ({
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
	depot: one(depots, {
		fields: [routes.depot_id],
		references: [depots.id]
	})
}));
