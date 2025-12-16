ALTER TABLE "stops" ALTER COLUMN "organization_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "stops" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stops" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
CREATE INDEX "stops_org_idx" ON "stops" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stops_map_idx" ON "stops" USING btree ("map_id");