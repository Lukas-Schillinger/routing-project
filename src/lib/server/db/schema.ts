// src/lib/server/db/schema.ts
import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	doublePrecision,
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
	created_at: ts('created_at'),
	created_by: uuid('created_by'),
	updated_at: ts('updated_at'),
	updated_by: uuid('updated_by'),

	name: varchar('name', { length: 200 }).notNull()
});

export const users = pgTable(
	'users',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		created_at: ts('created_at'),
		created_by: uuid('created_by'),
		updated_at: ts('updated_at'),
		updated_by: uuid('updated_by'),

		name: varchar('name', { length: 200 }),
		email: text('email').notNull().unique(),
		passwordHash: text('password_hash'),
		role: varchar('role', { length: 32 })
			.$type<'admin' | 'member' | 'viewer' | 'driver'>()
			.default('member')
			.notNull()
	},
	(t) => [
		uniqueIndex('users_user_org_uidx').on(t.organization_id, t.id),
		index('users_org_idx').on(t.organization_id)
	]
);

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	user_id: uuid().references(() => users.id, { onDelete: 'cascade' }),
	expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	created_at: ts('created_at'),
	updated_at: ts('updated_at')
});

export const magicLinks = pgTable('magic_links', {
	id,
	organization_id: orgId,
	created_at: ts('created_at'),
	created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
	updated_at: ts('updated_at').$onUpdate(() => new Date()),
	updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),

	expires_at: ts('expires_at'),
	type: text('type').$type<'invite' | 'login'>().notNull(),

	invitee_organization_id: uuid('invitee_organization_id').references(() => organizations.id, {
		onDelete: 'cascade'
	}), // used for invite
	email: text('email').notNull(), // used for invite
	role: varchar('role', { length: 32 }).$type<'admin' | 'member' | 'viewer' | 'driver'>(), // used for invite
	user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // used for login

	used_at: timestamp('used_at'), // used for invite
	token_hash: text('token_hash').notNull(),
	mail_record_id: uuid('mail_record_id').references(() => mailRecords.id, { onDelete: 'set null' })
});

export const drivers = pgTable(
	'drivers',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		created_at: ts('created_at'),
		created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		updated_at: ts('updated_at'),
		updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),

		user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		name: varchar('name', { length: 200 }).notNull(),
		phone: varchar('phone', { length: 32 }),
		notes: text('notes'),
		active: boolean('active').default(true).notNull(),
		temporary: boolean('temporary').default(false).notNull(), // Temporary drivers are deleted when removed from a map
		color: varchar('color', { length: 7 }).notNull()
	},
	(t) => [
		index('drivers_org_idx').on(t.organization_id),
		uniqueIndex('drivers_user_idx')
			.on(t.user_id)
			.where(sql`${t.user_id} IS NOT NULL`)
	]
);

export const maps = pgTable(
	'maps',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		created_at: ts('created_at'),
		created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		updated_at: ts('updated_at'),
		updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),

		title: varchar('title', { length: 200 }).notNull()
	},
	(t) => [index('maps_org_idx').on(t.organization_id)]
);

export const locations = pgTable(
	'locations',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		created_at: ts('created_at'),
		updated_at: ts('updated_at'),

		address_line_1: varchar('address_line_1', { length: 240 }).notNull(), // Mapbox v6 address_name field
		address_line_2: varchar('address_line_2', { length: 240 }), // Mapbox v6 secondary_address.name field

		address_number: varchar('address_number', { length: 240 }).notNull(),
		street_name: varchar('street_name', { length: 240 }).notNull(),
		city: varchar('city', { length: 120 }),
		region: varchar('region', { length: 120 }),
		postal_code: varchar('postal_code', { length: 40 }),
		country: varchar('country', { length: 2 }).notNull(),

		lat: doublePrecision('lat').notNull(),
		lon: doublePrecision('lon').notNull(),

		geocode_raw: jsonb('geocode_raw').notNull(),
		geocode_confidence: varchar('geocode_confidence', { length: 20 }).$type<
			'exact' | 'high' | 'medium' | 'low' | null
		>(), // Mapbox v6: 'exact', 'high', 'medium', 'low'
		geocode_provider: varchar('geocode_provider', { length: 40 }),
		geocode_place_id: varchar('geocode_place_id'),
		address_hash: varchar('address_hash', { length: 64 })
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
		created_at: ts('created_at'),
		created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		updated_at: ts('updated_at'),
		updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),

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
		notes: text('notes')
	},
	(t) => [index('stops_org_idx').on(t.organization_id), index('stops_map_idx').on(t.map_id)]
);

export const depots = pgTable(
	'depots',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		created_at: ts('created_at'),
		created_by: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		updated_at: ts('updated_at'),
		updated_by: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),

		location_id: uuid('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'cascade' }),
		name: varchar('name', { length: 200 }).notNull(),
		default_depot: boolean('default_depot').default(false).notNull()
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

export const matrices = pgTable('matrices', {
	id,
	organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
	map_id: uuid()
		.references(() => maps.id, { onDelete: 'cascade' })
		.notNull(),
	inputsHash: varchar('inputs_hash', { length: 64 }).notNull(),
	matrix: doublePrecision('matrix').array().array().notNull(),
	created_at: ts('created_at'),
	updated_at: ts('updated_at')
});

export const files = pgTable(
	'files',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		filename: text('filename').notNull(),
		original_filename: text('original_filename').notNull(),
		content_type: text('content_type').notNull(),
		size_bytes: integer('size_bytes').notNull(),
		r2_key: text('r2_key').notNull(), // The key in R2 bucket
		uploaded_by: uuid('uploaded_by')
			.notNull()
			.references(() => users.id),
		created_at: ts('created_at'),
		updated_at: ts('updated_at')
	},
	(t) => [
		index('files_org_idx').on(t.organization_id),
		index('files_uploader_idx').on(t.uploaded_by)
	]
);

export const optimizationJobs = pgTable('optimization_jobs', {
	id,
	organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
	status: varchar('status', { length: 20 })
		.notNull()
		.$type<'pending' | 'running' | 'completing' | 'completed' | 'failed' | 'cancelled'>(),
	matrix_id: uuid()
		.references(() => matrices.id, { onDelete: 'cascade' })
		.notNull(),
	map_id: uuid()
		.references(() => maps.id, { onDelete: 'cascade' })
		.notNull(),
	depot_id: uuid()
		.references(() => depots.id, { onDelete: 'cascade' })
		.notNull(),
	error_message: text('error_message'),
	created_at: ts('created_at'),
	updated_at: ts('updated_at')
});

export const mailRecords = pgTable(
	'mail_records',
	{
		id,
		organization_id: orgId.references(() => organizations.id, { onDelete: 'cascade' }),
		created_at: ts('created_at'),

		resend_id: varchar('resend_id', { length: 64 }).notNull().unique(),
		type: varchar('type', { length: 32 }).$type<'magic_invite' | 'magic_login'>().notNull(),
		to_email: text('to_email').notNull(),
		from_email: text('from_email').notNull(),
		subject: varchar('subject', { length: 500 }),
		status: varchar('status', { length: 32 })
			.$type<'sent' | 'delivered' | 'bounced' | 'complained' | 'delivery_delayed' | 'failed'>()
			.default('sent')
			.notNull(),
		delivered_at: timestamp('delivered_at', { withTimezone: true }),
		bounced_at: timestamp('bounced_at', { withTimezone: true }),
		error: text('error')
	},
	(t) => [
		index('mail_records_org_idx').on(t.organization_id),
		index('mail_records_resend_id_idx').on(t.resend_id),
		index('mail_records_type_idx').on(t.type),
		index('mail_records_status_idx').on(t.status)
	]
);

/***************************************************************************************
 *
 * 									Relations
 *
 **************************************************************************************/

export const organizationsRelations = relations(organizations, ({ many }) => ({
	users: many(users),
	drivers: many(drivers),
	maps: many(maps),
	locations: many(locations),
	stops: many(stops),
	driverMapMemberships: many(driverMapMemberships),
	depots: many(depots),
	routes: many(routes),
	matrices: many(matrices),
	files: many(files),
	optimizationJobs: many(optimizationJobs),
	mailRecords: many(mailRecords)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [users.organization_id],
		references: [organizations.id]
	}),
	uploadedFiles: many(files),
	driver: one(drivers, {
		fields: [users.id],
		references: [drivers.user_id]
	})
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [drivers.organization_id],
		references: [organizations.id]
	}),
	user: one(users, {
		fields: [drivers.user_id],
		references: [users.id]
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
	routes: many(routes),
	matrices: many(matrices),
	optimizationJobs: many(optimizationJobs)
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
	routes: many(routes),
	optimizationJobs: many(optimizationJobs)
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

export const filesRelations = relations(files, ({ one }) => ({
	organization: one(organizations, {
		fields: [files.organization_id],
		references: [organizations.id]
	}),
	uploadedBy: one(users, {
		fields: [files.uploaded_by],
		references: [users.id]
	})
}));

export const matricesRelations = relations(matrices, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [matrices.organization_id],
		references: [organizations.id]
	}),
	map: one(maps, {
		fields: [matrices.map_id],
		references: [maps.id]
	}),
	optimizationJobs: many(optimizationJobs)
}));

export const optimizationJobsRelations = relations(optimizationJobs, ({ one }) => ({
	organization: one(organizations, {
		fields: [optimizationJobs.organization_id],
		references: [organizations.id]
	}),
	matrix: one(matrices, {
		fields: [optimizationJobs.matrix_id],
		references: [matrices.id]
	}),
	map: one(maps, {
		fields: [optimizationJobs.map_id],
		references: [maps.id]
	}),
	depot: one(depots, {
		fields: [optimizationJobs.depot_id],
		references: [depots.id]
	})
}));

export const mailRecordsRelations = relations(mailRecords, ({ one, many }) => ({
	organization: one(organizations, {
		fields: [mailRecords.organization_id],
		references: [organizations.id]
	}),
	magicLinks: many(magicLinks)
}));

export const magicLinksRelations = relations(magicLinks, ({ one }) => ({
	organization: one(organizations, {
		fields: [magicLinks.organization_id],
		references: [organizations.id]
	}),
	mailRecord: one(mailRecords, {
		fields: [magicLinks.mail_record_id],
		references: [mailRecords.id]
	})
}));
