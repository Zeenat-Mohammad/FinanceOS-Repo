import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileText,
  LineChart,
  LockKeyhole,
  Mail,
  Moon,
  PiggyBank,
  Play,
  ReceiptText,
  Shield,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  WalletCards,
  WifiOff
} from 'lucide-react';
import { AuthScene } from '@/features/auth/AuthScene';
import { ProductWalkthrough, openProductWalkthrough } from '@/features/walkthrough/ProductWalkthrough';
import { BrandLogo } from '@/shared/components';
import { resolveTheme, useThemeStore } from '@/shared/state/theme';
import { cn } from '@/core/utils/cn';

const trustItems = [
  { label: 'Bank-Level Secure', icon: Shield },
  { label: 'Private by Design', icon: LockKeyhole },
  { label: 'Offline Ready', icon: WifiOff },
  { label: 'Installable App', icon: CheckCircle2 }
];

export default function LandingPage() {
  return (
    <AuthScene framed={false} contentClassName="relative z-10 min-h-screen">
      <LandingNav />
      <main>
        <section className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-14 px-5 pb-16 pt-28 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-accent shadow-sm">
              <Sparkles aria-hidden className="h-3.5 w-3.5" />
              Premium finance workspace
            </div>
            <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Your Complete Financial Operating System
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Plan smarter, track every dollar, forecast your future, eliminate debt, grow investments, and achieve financial freedom—all in one intelligent workspace.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link className="landing-primary-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-card transition" to="/signup">
                Get Started
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <a className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-surface-muted" href="#demo">
                <Play aria-hidden className="h-4 w-4" />
                Watch Demo
              </a>
            </div>
            <div className="mt-8 text-sm text-muted">Trusted by personal finance enthusiasts worldwide.</div>
            <div className="mt-4 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {trustItems.map(({ label, icon: Icon }) => (
                <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white px-3.5 py-3 text-xs font-semibold text-primary shadow-[0_14px_34px_rgba(3,7,18,0.14)]" key={label}>
                  <Icon aria-hidden className="h-4 w-4 text-accent" />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 70 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-2xl"
            id="demo"
          >
            <DashboardMockup />
          </motion.div>
        </section>
        <FunctionalitiesSection />
        <HowFinloWorksSection />
        <FaqSection />
      </main>
      <LandingFooter />
      <ProductWalkthrough />
    </AuthScene>
  );
}

function LandingNav() {
  const theme = useThemeStore((state) => state.theme);
  const cycleTheme = useThemeStore((state) => state.cycleTheme);
  const resolved = resolveTheme(theme);

  return (
    <nav className="landing-nav fixed z-30 px-5 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link className="text-primary" to="/">
          <BrandLogo markClassName="h-10 w-10" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Theme: ${theme}. Click to change.`}
            title={`Theme: ${theme}`}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-white text-primary shadow-sm transition hover:bg-surface-muted"
            onClick={cycleTheme}
          >
            {resolved === 'light' ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
          </button>
          <Link className="rounded-xl px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-primary" to="/login">Sign In</Link>
          <button className="landing-primary-button rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition" type="button" onClick={openProductWalkthrough}>Get Started</button>
        </div>
      </div>
    </nav>
  );
}

function DashboardMockup() {
  return (
    <div className="landing-dashboard-mock overflow-hidden p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">Finlo OS</p>
          <h2 className="mt-1 text-xl font-semibold text-primary">Financial Command Center</h2>
        </div>
        <div className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-muted">July 2026</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MockCard title="Net Worth" value="$148.2K" icon={WalletCards} />
        <MockCard title="Cash Flow" value="+$2,175" icon={TrendingUp} />
        <MockCard title="Forecast" value="Stable" icon={LineChart} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_12px_32px_rgba(31,37,68,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-primary">Forecast graph</span>
            <BarChart3 aria-hidden className="h-4 w-4 text-accent" />
          </div>
          <svg className="h-36 w-full" viewBox="0 0 420 150" aria-hidden>
            <path d="M0 122 C48 92 82 110 118 82 C158 50 198 76 230 54 C276 22 302 58 338 36 C372 16 392 24 420 10" fill="none" stroke="var(--color-accent-teal)" strokeWidth="3" />
            <path d="M0 134 C60 125 100 132 150 104 C206 73 248 90 288 70 C336 46 368 56 420 38" fill="none" stroke="var(--color-accent-purple)" strokeWidth="2" opacity=".65" />
            <path d="M0 122 C48 92 82 110 118 82 C158 50 198 76 230 54 C276 22 302 58 338 36 C372 16 392 24 420 10 L420 150 L0 150 Z" fill="var(--color-accent-teal)" opacity=".08" />
          </svg>
        </div>

        <div className="grid gap-3">
          <ProgressMock title="Budget progress" value="68%" />
          <ProgressMock title="Debt payoff" value="82%" />
          <ProgressMock title="Savings rate" value="24%" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniModule title="Calendar" icon={CalendarDays} body="5 bills scheduled" />
        <MiniModule title="Investments" icon={PiggyBank} body="+8.4% YTD" />
        <MiniModule title="AI insights" icon={Sparkles} body="3 actions found" />
      </div>
    </div>
  );
}

function MockCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof WalletCards }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_12px_32px_rgba(31,37,68,0.08)]">
      <Icon aria-hidden className="h-5 w-5 text-accent" />
      <p className="mt-3 text-xs text-muted">{title}</p>
      <p className="mt-1 text-lg font-semibold text-primary">{value}</p>
    </div>
  );
}

function ProgressMock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_12px_32px_rgba(31,37,68,0.08)]">
      <div className="flex justify-between text-sm">
        <span className="text-primary">{title}</span>
        <span className="text-success">{value}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-success" style={{ width: value }} />
      </div>
    </div>
  );
}

function MiniModule({ title, body, icon: Icon }: { title: string; body: string; icon: typeof CalendarDays }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_12px_32px_rgba(31,37,68,0.08)]">
      <Icon aria-hidden className="h-5 w-5 text-accent" />
      <p className="mt-3 text-sm font-medium text-primary">{title}</p>
      <p className="mt-1 text-xs text-muted">{body}</p>
    </div>
  );
}

const functionalityCards = [
  { title: 'Dashboard', description: 'See health, cash flow, upcoming payments, and monthly signals in one calm view.', icon: GaugeIcon, tag: 'Overview' },
  { title: 'Transactions', description: 'Use one ledger for income, expenses, transfers, receipts, and imports.', icon: ReceiptText, tag: 'Ledger' },
  { title: 'Monthly Budgets', description: 'Compare budget, actual, remaining, and progress automatically.', icon: ClipboardList, tag: 'Budget' },
  { title: 'Debt Center', description: 'Model avalanche and snowball payoff strategies with progress tracking.', icon: DollarSign, tag: 'Debt' },
  { title: 'Forecasting', description: 'Project cash, savings, debt payoff, and goal completion over time.', icon: LineChart, tag: 'Forecast' },
  { title: 'Investment Tracking', description: 'Track ETFs, funds, crypto, gold, and allocation in context.', icon: TrendingUp, tag: 'Wealth' },
  { title: 'Net Worth', description: 'Understand assets versus liabilities as a clear dashboard signal.', icon: WalletCards, tag: 'Worth' },
  { title: 'Goals', description: 'Create SMART goals with targets, dates, priorities, and contributions.', icon: Target, tag: 'Goals' },
  { title: 'Sinking Funds', description: 'Prepare for irregular expenses with dedicated targets and timelines.', icon: PiggyBank, tag: 'Savings' },
  { title: 'Recurring Bills', description: 'Track subscriptions, EMIs, salary, and reminders before they hit.', icon: CalendarClock, tag: 'Recurring' },
  { title: 'OCR Receipt Scanner', description: 'Extract merchant, date, and amount from receipts into drafts.', icon: ReceiptText, tag: 'Scanner' },
  { title: 'AI Financial Assistant', description: 'Ask grounded questions about finance, Finlo, and your data.', icon: Bot, tag: 'Assistant' },
  { title: 'Financial Calendar', description: 'View income, bills, debt, savings, and reminders by date.', icon: CalendarDays, tag: 'Calendar' },
  { title: 'Reports', description: 'Export clean monthly summaries for review, planning, and tax prep.', icon: FileText, tag: 'Reports' },
  { title: 'Smart Insights', description: 'Surface deterministic warnings and opportunities from your ledger.', icon: Brain, tag: 'Insights' },
  { title: 'Scenario Simulator', description: 'Explore what-if choices before a purchase, payoff, or plan.', icon: Sparkles, tag: 'Simulator' }
];

const howItWorksSteps = [
  ['Create Account', 'Sign up securely and create your personal household workspace.'],
  ['Complete Onboarding', 'Set currency, profile details, accounts, income, savings, and bills once.'],
  ['Add Accounts', 'Create bank, cash, card, loan, wallet, and investment accounts.'],
  ['Import or Add Transactions', 'Bring in CSV files, scan receipts, or manually record ledger activity.'],
  ['Create Budget', 'Assign monthly category plans and watch actuals update from transactions.'],
  ['Track Goals', 'Connect targets, deadlines, savings behavior, and progress.'],
  ['Monitor Investments', 'Keep wealth-building accounts beside cash flow and debt strategy.'],
  ['Forecast Your Future', 'Project savings, debt-free dates, cash, and financial health.'],
  ['Improve Financial Health', 'Use insights and habits to strengthen your month over time.']
];

const faqItems = [
  ['What is Finlo?', 'Finlo is a personal financial operating system for planning, tracking, forecasting, debt payoff, investments, and long-term wealth building.'],
  ['Is my data secure?', 'Finlo uses Supabase authentication, household-scoped access rules, protected storage, and client-side route guards to keep user data separated.'],
  ['Can I import CSV?', 'Yes. Finlo supports CSV upload, mapping, preview, validation, duplicate checks, and import summaries.'],
  ['Does Finlo support multiple currencies?', 'Yes. Currency is stored in your profile and reused across the app for formatting and display.'],
  ['Can I track investments?', 'Yes. Investment tracking is part of accounts, forecasting, and net-worth signals.'],
  ['How accurate is forecasting?', 'Forecasting is deterministic and based on your ledger, recurring items, savings behavior, debts, and assumptions. It is guidance, not a guarantee.'],
  ['Can I use Finlo offline?', 'Finlo is PWA ready and designed to remain useful with cached app shell behavior. Data sync depends on connectivity.'],
  ['Can I use multiple accounts?', 'Yes. Finlo supports multiple account groups including bank, cash, credit card, investment, loan, and wallet accounts.']
];

function FunctionalitiesSection() {
  const midpoint = Math.ceil(functionalityCards.length / 2);
  const rows = [functionalityCards.slice(0, midpoint), functionalityCards.slice(midpoint)];

  return (
    <motion.section
      className="relative overflow-hidden py-24"
      id="features"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(58,157,157,0.10),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(180,167,214,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(244,245,249,0.86))]" />
      <div className="absolute inset-0 -z-10 opacity-[0.45] [background-image:linear-gradient(rgba(71,79,122,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71,79,122,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Functionalities</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Everything You Need in One Place</h2>
        <p className="mt-4 text-base leading-7 text-muted">
          Powerful tools designed to help you budget smarter, eliminate debt, grow investments, and stay in complete control of your finances.
        </p>
      </div>

      <div className="features-marquee-mask mx-auto mt-12 hidden w-full max-w-[100rem] space-y-7 md:block">
        {rows.map((row, rowIndex) => (
          <FeatureMarqueeRow
            key={rowIndex}
            cards={row}
            direction={rowIndex === 0 ? 'left' : 'right'}
            rowIndex={rowIndex}
          />
        ))}
      </div>

      <div className="features-marquee-mask mx-auto mt-12 md:hidden">
        <div className="features-mobile-marquee overflow-x-auto px-5 pb-4 [scrollbar-width:none]">
          <div className="features-marquee-track features-marquee-left w-max">
            {[0, 1].map((groupIndex) => (
              <div className="features-marquee-set gap-4 pr-4" key={groupIndex}>
                {functionalityCards.map((card, index) => (
                  <FeatureCard
                    key={`${groupIndex}-${card.title}`}
                    card={card}
                    index={index}
                    duplicate={groupIndex === 1}
                    compact
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function FeatureMarqueeRow({
  cards,
  direction,
  rowIndex
}: {
  cards: typeof functionalityCards;
  direction: 'left' | 'right';
  rowIndex: number;
}) {
  return (
    <div className="features-marquee-row overflow-hidden" data-direction={direction}>
      <div
        className={cn(
          'features-marquee-track w-max',
          direction === 'left' ? 'features-marquee-left' : 'features-marquee-right'
        )}
      >
        {[0, 1].map((groupIndex) => (
          <div className="features-marquee-set gap-5 pr-5" key={groupIndex}>
            {cards.map((card, index) => (
              <FeatureCard
                key={`${rowIndex}-${groupIndex}-${card.title}`}
                card={card}
                index={index + rowIndex}
                duplicate={groupIndex === 1}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({
  card,
  index,
  duplicate,
  compact = false
}: {
  card: (typeof functionalityCards)[number];
  index: number;
  duplicate: boolean;
  compact?: boolean;
}) {
  const Icon = card.icon;
  const accents = [
    'text-accent bg-accent/10',
    'text-success bg-success/15',
    'text-info bg-info/10',
    'text-[var(--color-accent-purple)] bg-[var(--color-accent-purple)]/15'
  ];

  return (
    <article
      className={cn(
        'group flex shrink-0 flex-col rounded-[18px] border border-border bg-white p-6 shadow-[0_14px_36px_rgba(31,37,68,0.08)] outline-none transition duration-200 hover:-translate-y-1 hover:border-accent/45 hover:shadow-[0_24px_64px_rgba(31,37,68,0.15)] focus-visible:-translate-y-1 focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40',
        compact ? 'h-[220px] w-[240px]' : 'h-[240px] w-[300px] lg:w-[312px]'
      )}
      tabIndex={duplicate ? -1 : 0}
      aria-hidden={duplicate}
    >
      <div className={cn('grid h-12 w-12 place-items-center rounded-2xl transition duration-200 group-hover:scale-105', accents[index % accents.length])}>
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="mt-[18px] text-[17px] font-semibold leading-[1.3] text-primary">{card.title}</h3>
      <p className="mt-3 line-clamp-3 text-sm leading-[1.6] text-muted">{card.description}</p>
      <span className="mt-auto inline-flex w-fit rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-semibold text-secondary">
        {card.tag}
      </span>
    </article>
  );
}

function HowFinloWorksSection() {
  return (
    <section className="mx-auto w-full max-w-5xl px-5 py-20 lg:px-8" id="how-it-works">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">How Finlo works</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">From setup to better decisions</h2>
      </div>
      <div className="relative mt-12 space-y-5">
        <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-px bg-border sm:block" />
        {howItWorksSteps.map(([title, description], index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.45, delay: index * 0.03 }}
            className="relative grid gap-4 rounded-3xl border border-border bg-white p-5 shadow-[0_14px_36px_rgba(31,37,68,0.07)] sm:grid-cols-[3rem_1fr]"
          >
            <div className="relative z-10 grid h-12 w-12 place-items-center rounded-2xl bg-primary text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-20 lg:px-8" id="faq">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">Questions before you start?</h2>
          <p className="mt-4 text-muted">A few quick answers about security, imports, forecasting, currencies, and offline use.</p>
        </div>
        <div className="grid gap-3">
          {faqItems.map(([question, answer]) => (
            <details key={question} className="group rounded-2xl border border-border bg-white p-5 shadow-[0_12px_30px_rgba(31,37,68,0.06)]">
              <summary className="cursor-pointer list-none text-sm font-semibold text-primary">
                <span className="inline-flex w-full items-center justify-between gap-4">
                  {question}
                  <ArrowRight className="h-4 w-4 text-accent transition group-open:rotate-90" aria-hidden />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-white px-5 py-12 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <BrandLogo markClassName="h-10 w-10" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted">
            A premium financial operating system for calmer planning, sharper tracking, and long-term wealth decisions.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-muted"
            href="mailto:hajra.mshahid24@gmail.com"
          >
            <Mail className="h-4 w-4 text-accent" aria-hidden />
            Support
          </a>
          <a
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-secondary"
            href="/feedback"
          >
            Feedback
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>© {year} Finlo. All rights reserved.</span>
        <span>Plan · Track · Grow</span>
      </div>
    </footer>
  );
}

function GaugeIcon(props: React.ComponentProps<typeof BarChart3>) {
  return <BarChart3 {...props} />;
}
