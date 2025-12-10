CREATE TABLE "optimization_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(20) NOT NULL,
	"matrix_id" uuid NOT NULL,
	"map_id" uuid NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD CONSTRAINT "optimization_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD CONSTRAINT "optimization_jobs_matrix_id_matrices_id_fk" FOREIGN KEY ("matrix_id") REFERENCES "public"."matrices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimization_jobs" ADD CONSTRAINT "optimization_jobs_map_id_maps_id_fk" FOREIGN KEY ("map_id") REFERENCES "public"."maps"("id") ON DELETE cascade ON UPDATE no action;