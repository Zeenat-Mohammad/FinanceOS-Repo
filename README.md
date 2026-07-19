# Finlo - Ultimate Finance Manager 

<p align="center">

<a href="https://devpost.com/software/finlo" target="_blank">
  <img src="https://img.shields.io/badge/Devpost-Project-003E54?logo=devpost&logoColor=white" alt="Devpost">
</a>

<img src="https://img.shields.io/badge/OpenAI-Build%20Week-412991?logo=openai&logoColor=white" alt="OpenAI Build Week">

<img src="https://img.shields.io/badge/Built%20with-Codex-10A37F?logo=openai&logoColor=white" alt="Codex">

<img src="https://img.shields.io/badge/Powered%20by-GPT--5.6-74AA9C?logo=openai&logoColor=white" alt="GPT-5.6">

<img src="https://img.shields.io/github/stars/hajra40/FinanceOS-Repo?style=social" alt="GitHub Stars">

<img src="https://img.shields.io/github/forks/hajra40/FinanceOS-Repo?style=social" alt="GitHub Forks">

<img src="https://img.shields.io/github/repo-size/hajra40/FinanceOS-Repo" alt="Repo Size">

<img src="https://img.shields.io/github/last-commit/hajra40/FinanceOS-Repo" alt="Last Commit">

<img src="https://img.shields.io/github/license/hajra40/FinanceOS-Repo" alt="License">

<img src="https://komarev.com/ghpvc/?username=hajra40&repo=FinanceOS-Repo&label=Project%20Views&color=1f2544&style=flat" alt="Project Views">

<img src="https://img.shields.io/badge/AI-RAG%20Assistant-blueviolet" />

<img src="https://img.shields.io/badge/OCR-Receipt%20Scanner-orange" />

<img src="https://img.shields.io/badge/Forecasting-2%20Years-success" />

<img src="https://img.shields.io/badge/Status-Active%20Development-brightgreen" />

<img src="https://img.shields.io/badge/License-MIT-blue" />

<img src="https://img.shields.io/badge/Version-v1.0.0-1f2544" />

<img src="https://img.shields.io/badge/Made%20with-❤-red" />

</p>

---

> **A modern Personal Financial Operating System built to replace spreadsheets and disconnected finance apps with one intelligent workspace.**

Finlo is built with **React, TypeScript, Vite, Tailwind CSS, Supabase, React Query, Zustand, and Progressive Web App (PWA)** technologies.

Unlike traditional budgeting apps, Finlo follows a **ledger-first architecture**, where every financial transaction becomes the single source of truth. Dashboards, budgets, investments, debt management, forecasting, recurring bills, reports, net worth, and AI-powered insights are all derived from this unified financial ledger, ensuring consistency across the entire platform.

The vision is simple:

> **One application. One financial ledger. Complete control over your financial life.**


## Why Finlo?

The idea for Finlo came from a simple observation: most people don't use just one tool to manage their finances. They often have a budgeting app, a spreadsheet for expenses, another sheet for debt repayment, an investment tracker, and a calendar for bills. Managing money ends up meaning managing multiple tools.

While researching this space, I found that this isn't just a personal frustration—it's a growing market with plenty of room for innovation. According to **Fortune Business Insights**, the global **Personal Finance Software Market** was valued at around **USD 1.35 billion in 2025** and is expected to grow to **USD 2.57 billion by 2034**, driven by increasing adoption of digital financial tools, mobile applications, and AI-powered financial planning.

At the same time, user expectations are changing. People are no longer looking for apps that only track expenses. They want a complete picture of their financial life—budgets, savings, debt, investments, forecasting, recurring bills, and personalized insights—all in one place. AI is also becoming an important part of personal finance, helping users understand their spending habits, plan ahead, and make more informed decisions.

Today's leading products such as **YNAB**, **Monarch Money**, **Copilot Money**, **Rocket Money**, **Quicken Simplifi**, **Empower**, and **PocketSmith** each do an excellent job in specific areas. However, many users still end up switching between multiple apps or maintaining spreadsheets because no single platform covers everything seamlessly.

That's the gap Finlo aims to fill.

Instead of focusing on just budgeting or expense tracking, Finlo brings together budgeting, debt management, investments, net worth, forecasting, recurring payments, financial goals, OCR receipt scanning, and an AI-powered financial assistant into one connected workspace. The goal isn't to replace a single app—it's to replace the collection of tools people use to manage their finances.

---

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

---

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

---

## Finlo application workflow

Finlo uses a household-scoped, ledger-first workflow. Authentication and onboarding establish the user workspace; accounts, categories, and transactions become the source data for the remaining financial modules.

```mermaid
flowchart TD
    Visitor([Visitor]) --> Landing[Landing page]
    Landing --> Login[Login]
    Landing --> Signup[Signup]
    Login --> Auth[Supabase Auth]
    Signup --> Verify[Email verification]
    Verify --> Auth
    Auth --> Bootstrap[Initialize user workspace]

    Bootstrap --> Profile[(Profile)]
    Bootstrap --> Household[(Household and membership)]
    Bootstrap --> Defaults[(Default categories)]

    Profile --> Onboarding{Onboarding complete?}
    Household --> Onboarding
    Defaults --> Onboarding

    Onboarding -- No --> Wizard[Onboarding wizard]
    Wizard --> Personal[Country, currency, locale, timezone]
    Personal --> InitialAccounts[Accounts and opening balances]
    InitialAccounts --> InitialIncome[Income and savings]
    InitialIncome --> InitialBills[Bills and recurring commitments]
    InitialBills --> OptionalData[Optional goals, debt, assets, investments]
    OptionalData --> Complete[Mark onboarding complete]
    Complete --> Shell

    Onboarding -- Yes --> Shell[Protected application shell]

    Shell --> Dashboard
    Shell --> Accounts
    Shell --> Transactions
    Shell --> Categories
    Shell --> Recurring
    Shell --> Calendar
    Shell --> Debt
    Shell --> Savings
    Shell --> Forecast
    Shell --> Reports
    Shell --> ProfilePage[Profile and preferences]
    Shell --> Assistant[Floating assistant]
    Shell --> Admin{Admin role?}
    Admin -- Yes --> AdminDashboard[Admin dashboard]

    Accounts --> Ledger[(Household financial ledger)]
    Transactions --> Ledger
    Categories --> Ledger

    Ledger --> Dashboard
    Ledger --> Recurring
    Ledger --> Calendar
    Ledger --> Debt
    Ledger --> Savings
    Ledger --> Forecast
    Ledger --> Reports
    Ledger --> Assistant

    Recurring --> Instances[Generate payment instances]
    Instances --> Calendar
    Instances --> Paid{Marked paid?}
    Paid -- Yes --> Transactions

    Debt --> DebtEngine[Snowball or avalanche simulation]
    DebtEngine --> Dashboard
    DebtEngine --> Forecast

    Savings --> SavingsEngine[Streaks, challenges, forecasts]
    SavingsEngine --> Dashboard

    Forecast --> ForecastEngine[Cash flow and net-worth projections]
    ForecastEngine --> Dashboard

    Reports --> PDF[Monthly PDF preview, download, and print]
    Assistant --> Snapshot[Live accounts, spending, debt, and commitments]

    ProfilePage --> CurrencyChanged{Currency changed?}
    CurrencyChanged -- Yes --> FX[Fetch cached exchange rates]
    FX --> Convert[Convert household monetary values]
    Convert --> Refresh[Invalidate and refresh application queries]
    CurrencyChanged -- No --> SaveProfile[Save profile preferences]
```

### Transaction and recurring-payment workflow

```mermaid
flowchart LR
    Entry[Manual entry] --> Validate[React Hook Form and Zod]
    CSV[CSV import] --> Parse[Parse and validate rows]
    Receipt[Receipt image] --> OCR[OCR Edge Function]
    OCR --> Review[Review extracted fields]
    Review --> Validate
    Parse --> Batch[Create import batch]
    Batch --> Validate

    Validate --> Type{Transaction type}
    Type -- Income or expense --> Save[TransactionsRepository]
    Type -- Transfer --> TransferRPC[Atomic transfer RPC]

    Save --> TransactionsTable[(transactions)]
    TransferRPC --> TransactionsTable
    TransactionsTable --> Invalidate[Invalidate React Query caches]

    Rule[Recurring rule] --> PaymentEngine[PaymentEngine]
    PaymentEngine --> Instance[(recurring payment instance)]
    Instance --> CalendarView[Calendar and weekly widgets]
    Instance --> Status{Paid, skipped, or upcoming}
    Status -- Paid --> Save

    Invalidate --> DashboardView[Dashboard]
    Invalidate --> ReportsView[Reports]
    Invalidate --> SavingsView[Savings Center]
    Invalidate --> ForecastView[Forecast]
    Invalidate --> AssistantView[Assistant snapshot]
```

### Data, state, and security workflow

```mermaid
flowchart TB
    UI[React pages and components] --> Hooks[Feature hooks]
    Hooks --> Query[React Query]
    Hooks --> Stores[Zustand stores]

    Stores --> AuthState[Auth, profile, household]
    Stores --> UIState[Sidebar, theme, currency overlay]

    Query --> Repositories[Repository layer]
    Repositories --> SupabaseClient[Supabase client]
    Repositories --> LocalFallback[(Local storage fallback)]

    SupabaseClient --> AuthService[Supabase Auth]
    SupabaseClient --> Database[(Postgres)]
    SupabaseClient --> Storage[(Private Storage)]
    SupabaseClient --> Edge[Supabase Edge Functions]

    AuthService --> JWT[Authenticated JWT]
    JWT --> RLS[Row Level Security]
    RLS --> HouseholdCheck{Household member?}
    HouseholdCheck -- Yes --> Database
    HouseholdCheck -- No --> Denied[Access denied]

    Storage --> Avatars[User-scoped avatars]
    Storage --> Receipts[Household-scoped receipts]
    Storage --> Attachments[Household-scoped attachments]

    Edge --> OCRProvider[OCR provider]
    Edge --> ExternalAPIs[Protected external APIs]

    Database --> Query
    LocalFallback --> Query
    Query --> UI
```

### Route flow

```mermaid
flowchart LR
    Public["Public routes<br/>/ · /login · /signup · /auth/*"] --> ProtectedRoute{Authenticated?}
    ProtectedRoute -- No --> LoginRoute["/login"]
    ProtectedRoute -- Yes --> ShellRoute[Protected shell]
    ShellRoute --> OnboardingGuard{Onboarding complete?}
    OnboardingGuard -- No --> OnboardingRoute["/onboarding"]
    OnboardingGuard -- Yes --> AppRoutes["/dashboard · /profile · /accounts<br/>/transactions · /categories · /recurring<br/>/calendar · /debt · /savings<br/>/forecast · /reports"]
    ShellRoute --> AdminRoute{Admin metadata role?}
    AdminRoute -- Yes --> AdminPage["/admin"]
    AdminRoute -- No --> NotFound[Not found or access denied]
```

### Key workflow rules

1. **The ledger is the source of truth.** Dashboard, reports, savings, calendar, debt context, and forecasts derive their values from accounts, transactions, categories, and recurring instances.
2. **The household is the security boundary.** Household-owned rows are protected through Supabase Row Level Security.
3. **Repositories own data access.** React components call repositories through feature hooks rather than querying Supabase directly.
4. **Mutations refresh dependent modules.** Transaction, recurring, debt, profile, and currency updates invalidate the relevant React Query caches.
5. **Sensitive provider calls remain server-side.** OCR and future AI/provider integrations use Supabase Edge Functions so secret keys are never included in browser bundles.
6. **Fallback persistence is temporary resilience.** Local storage supports selected demo/offline workflows, while Postgres remains the intended authoritative store.

<<<<<<< HEAD
# 🛠️ Tech Stack
=======
# Tech Stack
>>>>>>> 882472fd6502f29a0d3af2a63d3c61b44e10fcd0

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?logo=reactrouter&logoColor=white)
![React Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-State_Management-764ABC)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-Charts-FF6384)
![Lucide](https://img.shields.io/badge/Lucide-Icons-000000)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

---

# Topics

`personal-finance` `budgeting` `expense-tracker` `financial-planning`
`money-management` `forecasting` `investments`
`debt-management` `net-worth`
`react` `typescript` `vite`
`supabase` `tailwindcss`
`pwa` `openai`
`rag`
`ocr`
`dashboard`
`analytics`

---

# References

- **Fortune Business Insights** — Personal Finance Software Market  
  https://www.fortunebusinessinsights.com/personal-finance-software-market-112683

- **Research and Markets** — Personal Finance App Market  
  https://www.researchandmarkets.com/report/personal-finance-app-market

- **Deloitte Insights** — Financial Services Industry Trends  
  https://www2.deloitte.com/global/en/insights/industry/financial-services.html

- **OpenAI** — GPT-5.6 & Codex Documentation  
  https://platform.openai.com/docs

- **Supabase Documentation**  
  https://supabase.com/docs

- **React Documentation**  
  https://react.dev

- **Vite Documentation**  
  https://vite.dev

- **Tailwind CSS Documentation**  
<<<<<<< HEAD
  https://tailwindcss.com/docs
=======
  https://tailwindcss.com/docs
>>>>>>> 882472fd6502f29a0d3af2a63d3c61b44e10fcd0
