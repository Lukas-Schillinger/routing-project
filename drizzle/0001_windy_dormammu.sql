CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"map_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"depot_id" uuid NOT NULL,
	"geometry" jsonb NOT NULL,
	"duration" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routes_map_idx" ON "routes" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "routes_driver_idx" ON "routes" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "routes_org_idx" ON "routes" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "routes_map_driver_uidx" ON "routes" USING btree ("map_id","driver_id");