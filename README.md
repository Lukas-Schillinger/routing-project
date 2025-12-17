# wend

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

# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
