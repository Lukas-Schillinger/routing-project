CREATE TABLE "route_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"share_type" varchar(16) NOT NULL,
	"access_token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"mail_record_id" uuid
);
--> statement-breakpoint
ALTER TABLE "route_shares" ADD CONSTRAINT "route_shares_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_shares" ADD CONSTRAINT "route_shares_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_shares" ADD CONSTRAINT "route_shares_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_shares" ADD CONSTRAINT "route_shares_mail_record_id_mail_records_id_fk" FOREIGN KEY ("mail_record_id") REFERENCES "public"."mail_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "route_shares_org_idx" ON "route_shares" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "route_shares_route_idx" ON "route_shares" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "route_shares_token_idx" ON "route_shares" USING btree ("access_token_hash");