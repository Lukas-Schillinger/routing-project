ALTER TABLE "drivers" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "drivers_user_idx" ON "drivers" USING btree ("user_id") WHERE "drivers"."user_id" IS NOT NULL;