import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: {
		// Use DIRECT_URL to perform supabase migrations
		// DIRECT_URL="" npm run db:migrate
		url: process.env.DIRECT_URL || process.env.DATABASE_URL!
	},
	verbose: true,
	strict: true
});
