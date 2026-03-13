CREATE INDEX "stops_driver_idx" ON "stops" USING btree ("driver_id");--> statement-breakpoint
CREATE INDEX "stops_location_idx" ON "stops" USING btree ("location_id");