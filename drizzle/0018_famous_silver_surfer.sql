CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"stripe_price_id" text NOT NULL,
	"monthly_credits" integer NOT NULL,
	"features" jsonb NOT NULL,
	CONSTRAINT "plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "plans_name_uidx" ON "plans" USING btree ("name");
--> statement-breakpoint
-- Seed default plans
-- Note: stripe_price_id values are placeholders. Update with actual Stripe price IDs after running `npm run db:migrate`.
-- See I-114 for Stripe configuration.
INSERT INTO "plans" ("name", "display_name", "stripe_price_id", "monthly_credits", "features")
VALUES
	('free', 'Free', 'price_free_placeholder', 200, '{"fleet_management": false}'),
	('pro', 'Pro', 'price_pro_placeholder', 2000, '{"fleet_management": true}');