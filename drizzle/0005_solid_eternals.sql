ALTER TABLE "depots" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "depots" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "magic_links" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "magic_links" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "stops" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "stops" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_by" uuid;--> statement-breakpoint

-- Backfill existing data: users self-reference
UPDATE "users" SET created_by = id, updated_by = id;--> statement-breakpoint

-- Backfill existing data: organizations use first admin
UPDATE "organizations" o SET
  created_by = (SELECT id FROM users WHERE organization_id = o.id AND role = 'admin' ORDER BY created_at LIMIT 1),
  updated_by = (SELECT id FROM users WHERE organization_id = o.id AND role = 'admin' ORDER BY created_at LIMIT 1);--> statement-breakpoint

-- Backfill existing data: org-scoped tables use first admin per org
UPDATE "maps" m SET
  created_by = (SELECT id FROM users WHERE organization_id = m.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1),
  updated_by = (SELECT id FROM users WHERE organization_id = m.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1);--> statement-breakpoint

UPDATE "drivers" d SET
  created_by = (SELECT id FROM users WHERE organization_id = d.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1),
  updated_by = (SELECT id FROM users WHERE organization_id = d.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1);--> statement-breakpoint

UPDATE "stops" s SET
  created_by = (SELECT id FROM users WHERE organization_id = s.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1),
  updated_by = (SELECT id FROM users WHERE organization_id = s.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1);--> statement-breakpoint

UPDATE "depots" dep SET
  created_by = (SELECT id FROM users WHERE organization_id = dep.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1),
  updated_by = (SELECT id FROM users WHERE organization_id = dep.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1);--> statement-breakpoint

UPDATE "magic_links" ml SET
  created_by = (SELECT id FROM users WHERE organization_id = ml.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1),
  updated_by = (SELECT id FROM users WHERE organization_id = ml.organization_id AND role = 'admin' ORDER BY created_at LIMIT 1);--> statement-breakpoint

ALTER TABLE "depots" ADD CONSTRAINT "depots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "depots" ADD CONSTRAINT "depots_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stops" ADD CONSTRAINT "stops_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;