# Finlo — FinancialOS

Finlo is a personal financial operating system built with React, TypeScript, Vite, TailwindCSS, Supabase, React Query, Zustand, and PWA support.

The application is designed around a ledger-first model: transactions are the source of truth, while dashboards, calendars, reports, savings, debt, and account summaries are derived from normalized financial activity.

## Core features

- Supabase authentication with protected app routes
- Required onboarding before accessing financial modules
- Household-based financial data model
- Manual accounts with account groups, opening balances, archive/delete flows
- Investment account section inside Accounts
- Ledger-powered Transactions monthly workspace
- CSV import/export support
- Receipt OCR scanner inside Transactions
- Responsive spending-by-category charts with category filtering
- Financial calendar timeline with transactions and recurring events
- Dashboard weekly calendar with clickable day navigation
- Recurring income/bills with mark-paid workflow
- Premium Debt Center with payoff strategy simulation
- Gamified Savings Center with ledger-derived no-spend calendar
- Dashboard widgets for net worth, cash flow, debt, investments, accounts, and health
- Reports module for financial summaries
- Profile page with preferences, avatar, security actions, and currency converter
- PWA-ready build output

## Tech stack

- React 19
- TypeScript
- Vite
- TailwindCSS
- React Router
- React Query
- Zustand
- React Hook Form + Zod
- Supabase Auth, Database, and Storage
- Recharts
- Lucide icons
- Vite PWA

## Getting started

Install dependencies:

```bash
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Then add your Supabase values:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the local dev server:

```bash
npm run dev
```

Run TypeScript validation:

```bash
npx tsc --noEmit
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Supabase setup

Apply migrations in order from the `supabase/migrations` directory.

The schema includes:

- profiles
- households
- household_members
- accounts
- categories
- transactions
- recurring rules and payment instances
- debt foundations
- savings foundations
- assets/liabilities foundations
- storage/security helpers

Row Level Security is expected to remain enabled. Users should only access data belonging to their household.

## Development notes

- Do not store duplicated financial totals.
- Use repositories for Supabase access; avoid direct Supabase queries inside UI components.
- Keep calculations in shared engines/selectors/repository models where possible.
- Dashboard, reports, savings, debt, and calendar should derive from transactions and recurring instances.
- Secrets must not be placed in `VITE_*` variables.
- Any future AI/OpenAI calls should run through a server or Supabase Edge Function.
