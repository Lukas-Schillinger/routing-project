-- Replace subscription schedule columns with cancel_at_period_end
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_schedule_id";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "scheduled_plan_id";
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false NOT NULL;
