CREATE TABLE "mail_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resend_id" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"to_email" text NOT NULL,
	"from_email" text NOT NULL,
	"subject" varchar(500),
	"status" varchar(32) DEFAULT 'sent' NOT NULL,
	"delivered_at" timestamp with time zone,
	"bounced_at" timestamp with time zone,
	CONSTRAINT "mail_records_resend_id_unique" UNIQUE("resend_id")
);
--> statement-breakpoint
ALTER TABLE "magic_links" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "magic_links" ADD COLUMN "mail_record_id" uuid;--> statement-breakpoint
ALTER TABLE "mail_records" ADD CONSTRAINT "mail_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_records_org_idx" ON "mail_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "mail_records_resend_id_idx" ON "mail_records" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX "mail_records_type_idx" ON "mail_records" USING btree ("type");--> statement-breakpoint
CREATE INDEX "mail_records_status_idx" ON "mail_records" USING btree ("status");--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_mail_record_id_mail_records_id_fk" FOREIGN KEY ("mail_record_id") REFERENCES "public"."mail_records"("id") ON DELETE set null ON UPDATE no action;