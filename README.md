# Commish 2.0

Sales performance dashboard MVP built with Next.js, Supabase Auth, and Supabase Postgres.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project at [supabase.com](https://supabase.com).

3. Copy `.env.local.example` to `.env.local` and add your Supabase URL and anon key:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the SQL schema in the Supabase SQL Editor:

```
supabase/schema.sql
```

5. Start the dev server:

```bash
npm run dev
```

## Routes

- `/login` — Sign in or create an account
- `/setup` — Monthly setup (targets, rostered days, starting stats)
- `/dashboard` — Personal performance dashboard with daily entry form
- `/leaderboard` — Team rankings by % to adjusted target

## Architecture

- Raw inputs stored in `monthly_setups` and `daily_entries`
- Dashboard and leaderboard stats calculated at read time via `lib/calculations.ts`
- Server Actions handle all mutations with auth checks
