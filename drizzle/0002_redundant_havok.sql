-- Delete existing optimization_jobs records without depot_id
DELETE FROM "optimization_jobs";--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD COLUMN "depot_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD CONSTRAINT "optimization_jobs_depot_id_depots_id_fk" FOREIGN KEY ("depot_id") REFERENCES "public"."depots"("id") ON DELETE cascade ON UPDATE no action;