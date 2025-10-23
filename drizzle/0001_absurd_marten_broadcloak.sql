CREATE TABLE "driver_map_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"driver_id" uuid NOT NULL,
	"map_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "driver_map_memberships" ADD CONSTRAINT "driver_map_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_map_memberships" ADD CONSTRAINT "driver_map_memberships_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_map_memberships" ADD CONSTRAINT "driver_map_memberships_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "driver_map_membership_uidx" ON "driver_map_memberships" USING btree ("driver_id","map_id");--> statement-breakpoint
CREATE INDEX "driver_map_memberships_driver_idx" ON "driver_map_memberships" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "driver_map_memberships_map_idx" ON "driver_map_memberships" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "driver_map_memberships_org_idx" ON "driver_map_memberships" USING btree ("organization_id");