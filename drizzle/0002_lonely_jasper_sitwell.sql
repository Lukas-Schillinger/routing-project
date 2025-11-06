ALTER TABLE "magic_links" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "magic_links" ALTER COLUMN "used_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "magic_links" ALTER COLUMN "used_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "magic_links" ALTER COLUMN "used_at" DROP NOT NULL;