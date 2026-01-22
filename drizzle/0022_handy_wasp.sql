ALTER TABLE "maps" ADD COLUMN "depot_id" uuid;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maps_depot_idx" ON "maps" USING btree ("depot_id");