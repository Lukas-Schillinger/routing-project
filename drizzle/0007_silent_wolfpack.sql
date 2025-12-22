ALTER TABLE "magic_links" DROP CONSTRAINT "magic_links_invitee_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "magic_links" ADD COLUMN "role" varchar(32) DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_invitee_organization_id_organizations_id_fk" FOREIGN KEY ("invitee_organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;