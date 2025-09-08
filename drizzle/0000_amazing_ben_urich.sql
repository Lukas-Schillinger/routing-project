CREATE TABLE "distance_matrices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"profile" varchar(32) DEFAULT 'driving' NOT NULL,
	"units" varchar(16) DEFAULT 'metric' NOT NULL,
	"provider" varchar(32) DEFAULT 'geoapify' NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'complete' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distance_matrix_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"matrix_id" uuid NOT NULL,
	"origin_stop_id" uuid NOT NULL,
	"dest_stop_id" uuid NOT NULL,
	"distance_meters" integer NOT NULL,
	"duration_seconds" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(32),
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid,
	"filename" varchar(240) NOT NULL,
	"byte_size" integer NOT NULL,
	"column_map" jsonb DEFAULT '{}'::jsonb,
	"storage_path" varchar(400),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200),
	"address_line1" varchar(240) NOT NULL,
	"address_line2" varchar(240),
	"city" varchar(120),
	"region" varchar(120),
	"postal_code" varchar(40),
	"country" varchar(2) DEFAULT 'US' NOT NULL,
	"lat" numeric(10, 6),
	"lon" numeric(10, 6),
	"geocode_provider" varchar(40),
	"geocode_confidence" numeric(5, 2),
	"geocode_place_id" varchar(120),
	"geocode_raw" jsonb,
	"address_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"stop_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"driver_id" uuid,
	"total_distance_m" integer DEFAULT 0 NOT NULL,
	"total_duration_s" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"external_ref" varchar(120),
	"contact_name" varchar(200),
	"contact_phone" varchar(32),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(32) DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "distance_matrices" ADD CONSTRAINT "distance_matrices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distance_matrices" ADD CONSTRAINT "distance_matrices_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distance_matrix_entries" ADD CONSTRAINT "distance_matrix_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distance_matrix_entries" ADD CONSTRAINT "distance_matrix_entries_matrix_id_distance_matrices_id_fk" FOREIGN KEY ("matrix_id") REFERENCES "public"."distance_matrices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distance_matrix_entries" ADD CONSTRAINT "distance_matrix_entries_origin_stop_id_stops_id_fk" FOREIGN KEY ("origin_stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distance_matrix_entries" ADD CONSTRAINT "distance_matrix_entries_dest_stop_id_stops_id_fk" FOREIGN KEY ("dest_stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "distance_matrices_request_uidx" ON "distance_matrices" USING btree ("organization_id","request_hash");--> statement-breakpoint
CREATE INDEX "distance_matrices_map_idx" ON "distance_matrices" USING btree ("map_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matrix_cell_uidx" ON "distance_matrix_entries" USING btree ("matrix_id","origin_stop_id","dest_stop_id");--> statement-breakpoint
CREATE INDEX "matrix_entries_matrix_idx" ON "distance_matrix_entries" USING btree ("matrix_id");--> statement-breakpoint
CREATE INDEX "drivers_org_idx" ON "drivers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "file_uploads_org_idx" ON "file_uploads" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "file_uploads_map_idx" ON "file_uploads" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "locations_org_idx" ON "locations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "locations_geo_idx" ON "locations" USING btree ("lat","lon");--> statement-breakpoint
CREATE INDEX "locations_addr_hash_idx" ON "locations" USING btree ("organization_id","address_hash");--> statement-breakpoint
CREATE INDEX "maps_org_idx" ON "maps" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "route_stops_route_seq_uidx" ON "route_stops" USING btree ("route_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "route_stops_route_stop_uidx" ON "route_stops" USING btree ("route_id","stop_id");--> statement-breakpoint
CREATE INDEX "route_stops_route_idx" ON "route_stops" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "routes_org_idx" ON "routes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "routes_map_idx" ON "routes" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "routes_driver_idx" ON "routes" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "stops_org_idx" ON "stops" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stops_map_idx" ON "stops" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "stops_location_idx" ON "stops" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_org_uidx" ON "users" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "profiles_org_idx" ON "users" USING btree ("organization_id");