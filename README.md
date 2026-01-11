# wend

![Coverage](https://img.shields.io/badge/coverage-services%2070%25-brightgreen)

Effortless routing from start to finish

Wend is a multistop optimization program with delivery management features.

## Stack

### Core

- **Svelte 5 & SvelteKit** - Full-stack framework
- **TypeScript** - Type safety

### Database & ORM

- **PostgreSQL** - Database (Supabase in production)
- **Drizzle ORM** - Type-safe database access
- **Zod** - Schema validation

### UI & Styling

- **Tailwind CSS** - Utility-first CSS
- **shadcn-svelte** - Component library
- **TanStack Table** - Data tables

### Maps & Routing

- **MapLibre GL** via svelte-maplibre - Map rendering
- **Maptiler** - Map tiles
- **Mapbox** - Distance matrix & navigation

### Infrastructure

- **Vercel** - Hosting
- **Cloudflare R2** - Static asset storage
- **AWS SQS & Lambda** - Background jobs
- **Resend** - Transactional email
- **Sentry** - Error tracking

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (or Docker for local development)

### Setup

1. Install dependencies:
   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and configure environment variables.
   See [`src/lib/server/env.ts`](src/lib/server/env.ts) for all required and optional variables.

3. Start the database:
   ```sh
   npm run db:start
   ```

4. Push the schema:
   ```sh
   npm run db:push
   ```

5. Start the dev server:
   ```sh
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run check` | Type check |
| `npm run lint` | Lint and format check |
| `npm run test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:studio` | Open Drizzle Studio |

## License

[AGPL-3.0](LICENSE)
