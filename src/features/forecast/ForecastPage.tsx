import { useMemo, useState } from 'react';
import {
  CalendarCheck2,
  Landmark,
  PiggyBank,
  Target,
  TrendingUp,
  Wallet,
  Activity
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { formatCurrency } from '@/core/utils/currency';
import { LoadingState, Page } from '@/shared/components';
import {
  DEFAULT_ASSUMPTIONS,
  type ForecastHorizon,
  type ForecastScenario,
  type ScenarioAssumptions,
  type WhatIfId
} from '@/core/forecast';
import { useForecast } from './useForecast';
import { exportForecastCsv, exportForecastExcel, exportForecastPdf } from './exportForecast';
import { ForecastHeader } from './components/ForecastHeader';
import { ForecastCard } from './components/ForecastCards';
import { ScenarioSwitcher } from './components/ScenarioSwitcher';
import { WhatIfPanel } from './components/WhatIfPanel';
import { ForecastCharts } from './components/ForecastCharts';
import { ForecastTable } from './components/ForecastTable';
import { ForecastInsights } from './components/ForecastInsights';
import { ForecastConfidence } from './components/ForecastConfidence';
import { ForecastFilters } from './components/ForecastFilters';
import { DebtDrawer } from '@/features/debt/components/DebtDrawer';
import { Button } from '@/shared/components';
import { Download } from 'lucide-react';

export default function ForecastPage() {
  const user = useAuthStore((s) => s.user);
  const household = useAuthStore((s) => s.household);
  const currency = household?.default_currency ?? 'USD';

  const [horizon, setHorizon] = useState<ForecastHorizon>(24);
  const [scenario, setScenario] = useState<ForecastScenario>('expected');
  const [assumptions, setAssumptions] = useState<ScenarioAssumptions>({ ...DEFAULT_ASSUMPTIONS });
  const [whatIfs, setWhatIfs] = useState<WhatIfId[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [showHistorical, setShowHistorical] = useState(true);

  const { bundle, computing } = useForecast({
    householdId: household?.id,
    userId: user?.id,
    horizon,
    scenario,
    assumptions,
    activeWhatIfs: whatIfs,
    refreshKey
  });

  const money = useMemo(() => (n: number) => formatCurrency(n, currency), [currency]);

  if (!household || !user) return <LoadingState label="Loading Forecast Center" />;
  if (computing && !bundle) return <LoadingState label="Computing forecast" />;
  if (!bundle) return <LoadingState label="Preparing forecast" />;

  const o = bundle.overview;

  return (
    <Page className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(58,157,157,0.18),_transparent_60%)]" />

      <ForecastHeader
        horizon={horizon}
        onHorizonChange={setHorizon}
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onDownload={() => setExportOpen(true)}
        refreshing={computing}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7" aria-label="Forecast summary">
        <ForecastCard
          label="Projected Net Worth"
          current={money(o.currentNetWorth)}
          predicted={money(o.projectedNetWorth)}
          changePct={o.currentNetWorth ? ((o.projectedNetWorth - o.currentNetWorth) / Math.abs(o.currentNetWorth)) * 100 : 0}
          confidence={bundle.netWorth.confidence}
          icon={TrendingUp}
        />
        <ForecastCard
          label="Projected Cash Balance"
          current={money(o.currentCashBalance)}
          predicted={money(o.projectedCashBalance)}
          changePct={o.currentCashBalance ? ((o.projectedCashBalance - o.currentCashBalance) / Math.abs(o.currentCashBalance)) * 100 : 0}
          confidence={bundle.cashBalance.confidence}
          icon={Wallet}
        />
        <ForecastCard
          label="Debt Free Date"
          current="—"
          predicted={o.debtFreeDate ?? 'Beyond horizon'}
          displayPredicted={o.debtFreeDate ?? 'Beyond horizon'}
          confidence={bundle.debt.confidence}
          icon={CalendarCheck2}
        />
        <ForecastCard
          label="Savings Growth"
          current={money(bundle.savings.historical.at(-1)?.value ?? 0)}
          predicted={money(bundle.savings.forecast.at(-1)?.value ?? 0)}
          changePct={o.savingsGrowthPct}
          confidence={bundle.savings.confidence}
          icon={PiggyBank}
        />
        <ForecastCard
          label="Investment Growth"
          current={money(bundle.investments.historical.at(-1)?.value ?? 0)}
          predicted={money(bundle.investments.forecast.at(-1)?.value ?? 0)}
          changePct={o.investmentGrowthPct}
          confidence={bundle.investments.confidence}
          icon={Landmark}
        />
        <ForecastCard
          label="Goal Completion"
          current={`${o.goalCompletionPct.toFixed(0)}%`}
          predicted={`${Math.min(100, o.goalCompletionPct + 20).toFixed(0)}% funded`}
          changePct={20}
          confidence={bundle.savings.confidence}
          icon={Target}
        />
        <ForecastCard
          label="Financial Health Score"
          current={o.financialHealthScore.toFixed(0)}
          predicted={o.financialHealthProjected.toFixed(0)}
          changePct={o.financialHealthProjected - o.financialHealthScore}
          confidence={bundle.financialHealth.confidence}
          icon={Activity}
        />
      </section>

      <ForecastCharts bundle={bundle} currency={currency} showHistorical={showHistorical} />

      <ForecastFilters horizon={horizon} showHistorical={showHistorical} onShowHistoricalChange={setShowHistorical} />

      <ScenarioSwitcher
        scenario={scenario}
        assumptions={assumptions}
        onScenarioChange={setScenario}
        onAssumptionsChange={(patch) => setAssumptions((prev) => ({ ...prev, ...patch }))}
      />

      <WhatIfPanel
        active={whatIfs}
        onToggle={(id) => setWhatIfs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
      />

      <ForecastTable rows={bundle.monthlyTable} currency={currency} />

      <ForecastConfidence
        modules={[
          { name: 'Cash Flow', series: bundle.cashFlow },
          { name: 'Income', series: bundle.income },
          { name: 'Expenses', series: bundle.expenses },
          { name: 'Savings', series: bundle.savings },
          { name: 'Debt', series: bundle.debt },
          { name: 'Investments', series: bundle.investments },
          { name: 'Net Worth', series: bundle.netWorth },
          { name: 'Health', series: bundle.financialHealth }
        ]}
      />

      <ForecastInsights insights={bundle.insights} />

      <DebtDrawer open={exportOpen} title="Download Forecast Report" onClose={() => setExportOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-muted">Export predictions, insights, and assumptions.</p>
          <Button
            className="w-full justify-start border border-border bg-transparent text-foreground hover:bg-secondary"
            onClick={() => {
              exportForecastCsv(bundle);
              setExportOpen(false);
            }}
          >
            <Download className="h-4 w-4" /> Forecast CSV
          </Button>
          <Button
            className="w-full justify-start border border-border bg-transparent text-foreground hover:bg-secondary"
            onClick={() => {
              exportForecastExcel(bundle);
              setExportOpen(false);
            }}
          >
            <Download className="h-4 w-4" /> Forecast Excel
          </Button>
          <Button
            className="w-full justify-start bg-success text-primary hover:bg-success/90"
            onClick={() => {
              exportForecastPdf(bundle, assumptions);
              setExportOpen(false);
            }}
          >
            <Download className="h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </DebtDrawer>
    </Page>
  );
}
