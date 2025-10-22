ALTER TABLE "distance_matrices" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "distance_matrix_entries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "distance_matrices" CASCADE;--> statement-breakpoint
DROP TABLE "distance_matrix_entries" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "organization_id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;