-- Normalize existing emails to lowercase before recreating unique index
UPDATE "users" SET "email" = LOWER("email") WHERE "email" != LOWER("email");--> statement-breakpoint
UPDATE "invitations" SET "email" = LOWER("email") WHERE "email" != LOWER("email");--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");