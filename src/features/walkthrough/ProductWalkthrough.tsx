import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  CreditCard,
  Gauge,
  Landmark,
  LineChart,
  ReceiptText,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
  X
} from 'lucide-react';
import { Button } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export const WALKTHROUGH_STORAGE_KEY = 'finlo.productWalkthrough.completed';
export const OPEN_WALKTHROUGH_EVENT = 'finlo:open-product-walkthrough';

export function openProductWalkthrough() {
  window.dispatchEvent(new CustomEvent(OPEN_WALKTHROUGH_EVENT));
}

const steps = [
  {
    title: 'Welcome to Finlo',
    eyebrow: 'Product tour',
    description:
      'Finlo is your financial operating system: a calm workspace for planning, tracking, forecasting, and improving your financial health.',
    icon: Sparkles,
    spotlight: 'The workspace shell, navigation, and assistant stay connected around one ledger.'
  },
  {
    title: 'Dashboard',
    eyebrow: 'Daily command center',
    description:
      'Start with balances, monthly signals, upcoming payments, health score, budget status, and recent movement at a glance.',
    icon: Gauge,
    spotlight: 'Dashboard widgets summarize the latest ledger, recurring, debt, savings, and forecast signals.'
  },
  {
    title: 'Accounts',
    eyebrow: 'Money containers',
    description:
      'Add bank, cash, wallet, credit card, loan, and investment accounts so every transaction has a home.',
    icon: WalletCards,
    spotlight: 'Account balances are derived from opening balance and transactions instead of duplicated totals.'
  },
  {
    title: 'Transactions',
    eyebrow: 'Ledger source of truth',
    description:
      'Record income, expenses, transfers, refunds, adjustments, receipts, OCR scans, and CSV imports in one normalized ledger.',
    icon: ReceiptText,
    spotlight: 'The ledger powers budgets, calendar, savings, debt, reports, forecasts, and the assistant.'
  },
  {
    title: 'Budgets',
    eyebrow: 'Monthly control',
    description:
      'Create category budgets and compare planned vs actual spending without losing sight of cash flow.',
    icon: CreditCard,
    spotlight: 'Budget progress comes from categorized transactions for the selected month.'
  },
  {
    title: 'Debt',
    eyebrow: 'Payoff strategy',
    description:
      'Compare avalanche and snowball strategies, track minimum payments, and see debt-free progress.',
    icon: Landmark,
    spotlight: 'Debt insights combine liabilities, payments, APRs, and simulated extra payments.'
  },
  {
    title: 'Forecasting',
    eyebrow: 'Future view',
    description:
      'Project cash, savings, investments, debt-free dates, and goal completion across different time horizons.',
    icon: LineChart,
    spotlight: 'Forecasts are deterministic and update when the ledger changes.'
  },
  {
    title: 'Investments',
    eyebrow: 'Wealth building',
    description:
      'Track stocks, ETFs, mutual funds, crypto, gold, and long-term allocation from your account workspace.',
    icon: TrendingUp,
    spotlight: 'Investment tracking is treated as part of net worth and future growth.'
  },
  {
    title: 'Goals',
    eyebrow: 'Purposeful planning',
    description:
      'Create SMART goals, sinking funds, savings targets, and deadline-based plans.',
    icon: Target,
    spotlight: 'Goals connect to savings behavior and monthly planning rather than sitting alone.'
  },
  {
    title: 'AI Assistant',
    eyebrow: 'RAG financial guide',
    description:
      'Ask Finlo about financial concepts, product workflows, or your own spending and debt using retrieved context.',
    icon: Bot,
    spotlight: 'The assistant cites retrieved knowledge and live household data where available.'
  },
  {
    title: 'You are ready',
    eyebrow: 'Finish',
    description:
      'Use the dashboard for daily awareness, transactions for truth, and forecasting for better decisions.',
    icon: CheckCircle2,
    spotlight: 'You can restart this walkthrough anytime from Profile or Help.'
  }
];

function markWalkthroughComplete() {
  localStorage.setItem(WALKTHROUGH_STORAGE_KEY, new Date().toISOString());
}

export function ProductWalkthrough() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const Icon = step.icon;
  const progress = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex]);

  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_WALKTHROUGH_EVENT, handler);
    return () => window.removeEventListener(OPEN_WALKTHROUGH_EVENT, handler);
  }, []);

  if (!open) return null;

  function close(completed = false) {
    if (completed) markWalkthroughComplete();
    setOpen(false);
  }

  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-primary/80 p-4 backdrop-blur-sm">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[8%] top-[10%] h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-[14%] right-[10%] h-72 w-72 rounded-full bg-info/20 blur-3xl" />
        <div className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/15 bg-white shadow-[0_30px_90px_rgba(3,7,18,0.38)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative hidden min-h-[34rem] overflow-hidden bg-[var(--color-sidebar)] p-8 text-white lg:block">
            <div className="absolute inset-0 opacity-30">
              <div className="h-full w-full bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
            </div>
            <div className="absolute left-12 top-20 h-48 w-48 rounded-full border border-accent/35" />
            <div className="absolute bottom-16 right-8 h-64 w-64 rounded-full border border-info/35" />
            <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/8 shadow-[0_0_0_80px_rgba(255,255,255,0.03),0_0_90px_rgba(58,157,157,0.28)]" />
            <div className="relative flex h-full flex-col justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-success">Finlo tour</p>
                <h2 className="mt-4 text-3xl font-semibold">Guided financial workspace</h2>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <Icon className="h-8 w-8 text-success" aria-hidden />
                <p className="mt-4 text-sm leading-6 text-white/78">{step.spotlight}</p>
              </div>
            </div>
          </div>

          <section className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{step.eyebrow}</div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted hover:bg-surface-muted"
                aria-label="Close product walkthrough"
                onClick={() => close(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="mt-8 grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
              <Icon className="h-8 w-8" aria-hidden />
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-primary sm:text-4xl">{step.title}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">{step.description}</p>

            <div className="mt-8">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                <span>Step {stepIndex + 1} of {steps.length}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-4">
              {steps.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={cn(
                    'h-2 rounded-full transition',
                    index <= stepIndex ? 'bg-accent' : 'bg-surface-muted hover:bg-secondary/30'
                  )}
                  aria-label={`Go to ${item.title}`}
                  onClick={() => setStepIndex(index)}
                />
              ))}
            </div>

            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                className="text-sm font-semibold text-muted hover:text-primary"
                onClick={() => close(true)}
              >
                Skip tour
              </button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  className="border border-border bg-white text-primary hover:bg-surface-muted"
                  disabled={stepIndex === 0}
                  onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Previous
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (isLast) close(true);
                    else setStepIndex((value) => Math.min(steps.length - 1, value + 1));
                  }}
                >
                  {isLast ? 'Finish' : 'Next'}
                  {isLast ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
