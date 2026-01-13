ALTER TABLE "optimization_jobs" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "updated_by" uuid;--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD CONSTRAINT "optimization_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD CONSTRAINT "optimization_jobs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;