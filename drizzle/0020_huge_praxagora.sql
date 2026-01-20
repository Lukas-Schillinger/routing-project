CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"expires_at" timestamp with time zone,
	"description" text,
	"stripe_payment_intent_id" text,
	"optimization_job_id" uuid
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_optimization_job_id_optimization_jobs_id_fk" FOREIGN KEY ("optimization_job_id") REFERENCES "public"."optimization_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transactions_org_idx" ON "credit_transactions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_org_created_idx" ON "credit_transactions" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_optimization_job_idx" ON "credit_transactions" USING btree ("optimization_job_id");