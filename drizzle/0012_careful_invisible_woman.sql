CREATE TABLE "email_confirmation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mail_record_id" uuid
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_confirmation_tokens" ADD CONSTRAINT "email_confirmation_tokens_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_confirmation_tokens" ADD CONSTRAINT "email_confirmation_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_confirmation_tokens" ADD CONSTRAINT "email_confirmation_tokens_mail_record_id_mail_records_id_fk" FOREIGN KEY ("mail_record_id") REFERENCES "public"."mail_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_confirmation_tokens_org_idx" ON "email_confirmation_tokens" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "email_confirmation_tokens_user_idx" ON "email_confirmation_tokens" USING btree ("user_id");