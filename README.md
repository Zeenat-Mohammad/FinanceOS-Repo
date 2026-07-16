# FinancialOS Starter Template

This folder contains an initial V1 starter template scaffold for **FinancialOS** (React + TypeScript + Vite + Tailwind + Zustand + React Router + Supabase + PWA).

## Tech
- React 19 + TypeScript
- Vite
- TailwindCSS
- shadcn/ui (add components later with `npx shadcn@latest add <component>`)
- Recharts (installed; example wiring included)
- Zustand
- React Router
- React Hook Form + Zod
- Supabase
- Vitest + React Testing Library
- Vite PWA (offline-first baseline)

## Next steps
1. `npm install`
2. Create `.env.local` (see `.env.example`)
3. `npm run dev`
4. Run tests: `npm test`

## Build order

1. Apply [`supabase/migrations/0001_foundation.sql`](supabase/migrations/0001_foundation.sql) in Supabase (or with the Supabase CLI). It creates profiles, accounts, categories, transactions, indexes and private RLS policies.
2. Enable RLS and add an `auth.uid() = user_id` policy for every new user-owned table.
3. Build Accounts and Transactions first; derive dashboard totals, budgets, goals, debt and forecasts from those records.
4. Put any OpenAI calls in a Supabase Edge Function. Never put a secret key in a `VITE_*` variable.


