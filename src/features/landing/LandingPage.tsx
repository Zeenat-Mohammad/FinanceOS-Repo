import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  LineChart,
  LockKeyhole,
  Moon,
  PiggyBank,
  Play,
  Shield,
  Sparkles,
  Sun,
  TrendingUp,
  WalletCards,
  WifiOff
} from 'lucide-react';
import { AuthScene } from '@/features/auth/AuthScene';
import { BrandLogo } from '@/shared/components';
import { resolveTheme, useThemeStore } from '@/shared/state/theme';

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
      </main>
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
          <Link className="landing-primary-button rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition" to="/signup">Get Started</Link>
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

