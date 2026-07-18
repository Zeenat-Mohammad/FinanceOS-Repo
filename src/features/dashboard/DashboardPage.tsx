import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { ErrorState, Page } from '@/shared/components';
import { useDashboardSummary } from './useDashboardSummary';
import { DashboardHeader } from './components/DashboardHeader';
import { HeroCards } from './components/HeroCards';
import { QuickActions } from './components/QuickActions';
import { InsightCards } from './components/InsightCards';
import { FinancialHealthCard } from './components/FinancialHealthCard';
import { DashboardCharts } from './components/DashboardCharts';
import { WeeklyPaymentsWidget } from './components/WeeklyPaymentsWidget';
import { MiniCalendar } from './components/MiniCalendar';
import { DebtWidget } from './components/DebtWidget';
import { InvestmentWidget } from './components/InvestmentWidget';
import { UpcomingTimeline } from './components/UpcomingTimeline';
import { RecentTransactions } from './components/RecentTransactions';
import { MonthlySnapshot } from './components/MonthlySnapshot';
import { AccountsSummary } from './components/AccountsSummary';
import { DashboardFooter } from './components/DashboardFooter';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { CurrencyConverter } from './components/CurrencyConverter';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const household = useAuthStore((s) => s.household);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const locale = profile?.locale ?? household?.locale ?? 'en-US';
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const { model, isLoading, isError, refetch } = useDashboardSummary(household?.id, user?.id);

  if (isLoading && !model) return <DashboardSkeleton />;

  if (isError && !model) {
    return (
      <Page>
        <ErrorState
          title="Couldn’t load dashboard"
          message="Check your connection and try again."
          action={
            <button type="button" className="rounded-md bg-accent px-3 py-2 text-sm text-white" onClick={() => refetch()}>
              Retry
            </button>
          }
        />
      </Page>
    );
  }

  if (!model) return <DashboardSkeleton />;

  return (
    <Page className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(58,157,157,0.16),_transparent_55%)]" />

      <DashboardHeader
        firstName={firstName}
        currency={currency}
        monthLabel={model.monthLabel}
        onQuickAdd={() => navigate('/transactions')}
      />

      <QuickActions />

      <CurrencyConverter baseCurrency={currency} />

      <HeroCards hero={model.hero} currency={currency} />

      <InsightCards insights={model.insights} />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <FinancialHealthCard score={model.hero.healthScore.value} breakdown={model.healthBreakdown} />
        </div>
        <div className="xl:col-span-4">
          <MonthlySnapshot snapshot={model.monthlySnapshot} currency={currency} locale={locale} />
        </div>
      </div>

      <DashboardCharts
        cashFlowHistory={model.cashFlowHistory}
        categoryBreakdown={model.categoryBreakdown}
        netWorthSeries={model.forecastBundle?.netWorth ?? null}
        currency={currency}
      />

      {household && user ? (
        <div className="grid gap-4 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <WeeklyPaymentsWidget currency={currency} householdId={household.id} userId={user.id} />
          </div>
          <div className="xl:col-span-4">
            <MiniCalendar householdId={household.id} />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DebtWidget debt={model.debt} currency={currency} />
        <InvestmentWidget investments={model.investments} currency={currency} />
        <UpcomingTimeline items={model.upcoming} currency={currency} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AccountsSummary accounts={model.accountsSummary} total={model.accountsTotal} currency={currency} />
        <RecentTransactions transactions={model.recent} currency={currency} />
      </div>
      <section aria-label="AI insights placeholder">
        <div className="rounded-brand border border-dashed border-border/70 bg-surface/40 p-4 backdrop-blur-md">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-accent">AI Insights · future</div>
          <p className="mt-1 text-sm text-muted">
            Copilot explanations will sit here — today’s insights above are fully deterministic from your ledger.
          </p>
        </div>
      </section>

      <DashboardFooter />
    </Page>
  );
}
