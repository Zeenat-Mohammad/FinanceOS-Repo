import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DashboardRepository,
  buildMonthlyWorkspaceModel,
  buildUpcomingItems,
  getMonthWindow,
  investmentBreakdown,
  liquidCash,
  monthlyTotalsFromHistory,
  totalDebtMajor
} from '@/data/repositories/DashboardRepository';
import { queryKeys } from '@/data/query-keys';
import { useDebtSimulation } from '@/features/debt/useDebtSimulation';
import { useForecast, DEFAULT_ASSUMPTIONS } from '@/features/forecast/useForecast';
import { fromMinor } from '@/core/debt';
import type { FinanceInsight } from '@/features/transactions-workspace/monthlyFinance';

export type DashboardInsight = {
  id: string;
  title: string;
  detail: string;
  tone: 'good' | 'warning' | 'info';
};

export function useDashboardSummary(householdId?: string, userId?: string) {
  const summaryQuery = useQuery({
    queryKey: queryKeys.dashboard.summary(householdId ?? 'none'),
    queryFn: () => DashboardRepository.getSummary(householdId!, userId!),
    enabled: Boolean(householdId && userId),
    staleTime: 30_000
  });

  const raw = summaryQuery.data;

  const debtSimulation = useDebtSimulation(raw?.debts ?? [], raw?.debtSettings ?? {
    strategy: 'avalanche',
    start_month: new Date().getMonth(),
    start_year: new Date().getFullYear(),
    extra_payment_minor: 0,
    custom_order: [],
    saved_at: null
  });

  const forecast = useForecast({
    householdId,
    userId,
    horizon: 24,
    scenario: 'expected',
    assumptions: DEFAULT_ASSUMPTIONS,
    activeWhatIfs: [],
    refreshKey: 0
  });

  const model = useMemo(() => {
    if (!raw) return null;

    const month = getMonthWindow(new Date());
    const workspace = buildMonthlyWorkspaceModel({
      transactions: raw.currentTransactions,
      previousTransactions: raw.previousTransactions,
      accounts: raw.accounts,
      categories: raw.categories,
      month
    });

    const cashAvailable = liquidCash(raw.accounts);
    const debtTotal = totalDebtMajor(raw.debts);
    const invest = investmentBreakdown(raw.accounts, raw.wealth);
    const cashFlowHistory = monthlyTotalsFromHistory(raw.historyTransactions, 6);
    const upcoming = buildUpcomingItems({
      bills: raw.bills,
      rules: raw.rules,
      expected: raw.expected
    });

    const incomeKpi = workspace.kpis.find((k) => k.id === 'income');
    const expenseKpi = workspace.kpis.find((k) => k.id === 'expenses');
    const savingsKpi = workspace.kpis.find((k) => k.id === 'savings');
    const cashFlowKpi = workspace.kpis.find((k) => k.id === 'net-cash-flow');
    const savingsRateKpi = workspace.kpis.find((k) => k.id === 'savings-rate');

    const accountAssets = raw.accounts
        .filter((a) => !a.is_archived && !a.deleted_at && ['checking', 'savings', 'wallet', 'cash'].includes(a.type))
        .reduce((s, a) => s + (a.balance || a.opening_balance || 0), 0);
    const normalizedAssets = raw.wealth.assets.reduce((sum, row) => sum + row.estimated_value, 0);
    const assets = accountAssets + invest.total + normalizedAssets;

    const accountLiabilities = raw.accounts
        .filter((a) => !a.is_archived && !a.deleted_at && ['credit_card', 'loan'].includes(a.type))
        .reduce((s, a) => s + Math.abs(a.balance || a.opening_balance || 0), 0);
    const normalizedLiabilities = raw.wealth.loans.reduce((sum, row) => sum + row.remaining_balance, 0)
      + raw.wealth.credit_cards.reduce((sum, row) => sum + row.outstanding_balance, 0);
    const liabilities = Math.max(accountLiabilities, debtTotal) + normalizedLiabilities;

    const netWorth = forecast.bundle?.overview.currentNetWorth ?? assets - liabilities;
    const previousNetWorth = netWorth - (cashFlowKpi?.value ?? 0) * 0.3;

    const healthScore = Math.round(
      forecast.bundle?.overview.financialHealthScore ??
        scoreHealth({
          cashFlow: cashFlowKpi?.value ?? 0,
          savingsRate: savingsRateKpi?.value ?? 0,
          debtTotal,
          income: incomeKpi?.value ?? 0,
          budgetUsed: workspace.kpis.find((k) => k.id === 'budget-used')?.value ?? 0
        })
    );

    const insights = buildDashboardInsights({
      workspaceInsights: workspace.insights,
      expenseTrend: expenseKpi?.trend ?? 0,
      savings: workspace.savings,
      upcoming,
      topCategory: workspace.categoryBreakdown[0],
      debtFree: debtSimulation.overview.debtFreeDate?.label ?? null,
      salaryTomorrow: upcoming.find((u) => u.kind === 'income' && u.daysUntil <= 1)
    });

    const accountsSummary = raw.accounts
      .filter((a) => !a.is_archived && !a.deleted_at)
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        name: a.name,
        institution: a.institution,
        type: a.type,
        balance: a.balance || a.opening_balance || 0
      }));

    const largestExpense = [...raw.currentTransactions]
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)[0];
    const largestIncome = [...raw.currentTransactions]
      .filter((t) => t.type === 'income')
      .sort((a, b) => b.amount - a.amount)[0];

    return {
      monthLabel: raw.monthLabel,
      workspace,
      hero: {
        netWorth: {
          value: netWorth,
          previous: previousNetWorth,
          trend: previousNetWorth === 0 ? 0 : ((netWorth - previousNetWorth) / Math.abs(previousNetWorth)) * 100,
          sparkline: cashFlowHistory.map((r) => r.net)
        },
        cashAvailable: {
          value: cashAvailable,
          previous: cashAvailable - (cashFlowKpi?.value ?? 0),
          trend: cashFlowKpi?.trend ?? 0,
          sparkline: workspace.dailySeries.map((d) => d.net)
        },
        monthlySpending: {
          value: expenseKpi?.value ?? 0,
          previous: expenseKpi?.previousValue ?? 0,
          trend: expenseKpi?.trend ?? 0,
          sparkline: expenseKpi?.sparkline ?? []
        },
        monthlySavings: {
          value: savingsKpi?.value ?? 0,
          previous: savingsKpi?.previousValue ?? 0,
          trend: savingsKpi?.trend ?? 0,
          sparkline: savingsKpi?.sparkline ?? []
        },
        healthScore: {
          value: healthScore,
          previous: Math.max(0, healthScore - 3),
          trend: 3,
          sparkline: [healthScore - 8, healthScore - 5, healthScore - 2, healthScore]
        }
      },
      cashFlowHistory,
      categoryBreakdown: workspace.categoryBreakdown,
      budgetRows: workspace.budgetRows.filter((r) => r.id !== 'Income'),
      goals: (forecast.bundle?.goals ?? workspace.savings.map((s) => ({
        id: s.id,
        name: s.goal,
        target: s.current > 0 ? s.current / Math.max(s.progress / 100, 0.05) : 10000,
        current: s.current,
        monthlyContribution: s.contribution,
        projectedCompletionLabel: null as string | null,
        monthsToComplete: null as number | null,
        completionPct: s.progress
      }))),
      debt: {
        total: fromMinor(debtSimulation.overview.currentBalanceMinor) || debtTotal,
        monthlyPayment: fromMinor(debtSimulation.overview.monthlyPaymentsMinor),
        interestRemaining: fromMinor(debtSimulation.overview.totalInterestRemainingMinor),
        debtFreeDate: debtSimulation.overview.debtFreeDate?.label ?? null,
        monthsRemaining: debtSimulation.overview.monthsRemaining,
        sparkline: debtSimulation.selected.monthlyBalances.slice(0, 12).map((m) => fromMinor(m.balanceMinor))
      },
      investments: invest,
      upcoming,
      recent: workspace.recent,
      accountsSummary,
      accountsTotal: accountsSummary.reduce((s, a) => s + a.balance, 0),
      insights,
      monthlySnapshot: {
        income: incomeKpi?.value ?? 0,
        expenses: expenseKpi?.value ?? 0,
        savingsRate: savingsRateKpi?.value ?? 0,
        netCash: cashFlowKpi?.value ?? 0,
        largestExpense: largestExpense?.amount ?? 0,
        largestExpenseLabel: largestExpense?.merchant || largestExpense?.description || '—',
        largestIncome: largestIncome?.amount ?? 0,
        largestIncomeLabel: largestIncome?.merchant || largestIncome?.description || '—',
        budgetAccuracy: Math.max(0, 100 - Math.abs((workspace.kpis.find((k) => k.id === 'budget-used')?.value ?? 0) - 80))
      },
      healthBreakdown: {
        overall: healthScore,
        budget: clamp(100 - (workspace.kpis.find((k) => k.id === 'budget-used')?.value ?? 50) * 0.5, 0, 100),
        savings: clamp((savingsRateKpi?.value ?? 0) * 4, 0, 100),
        debt: debtTotal <= 0 ? 95 : clamp(100 - (debtTotal / Math.max(incomeKpi?.value ?? 1, 1) / 12) * 40, 20, 95),
        investments: invest.total > 0 ? 72 : 40,
        emergency: workspace.savings.find((s) => /emergency/i.test(s.goal))?.progress ?? 35,
        cashFlow: (cashFlowKpi?.value ?? 0) >= 0 ? 78 : 42
      },
      forecastBundle: forecast.bundle,
      hasTransactions: raw.currentTransactions.length + raw.historyTransactions.length > 0,
      hasAccounts: raw.accounts.length > 0
    };
  }, [raw, debtSimulation, forecast.bundle]);

  return {
    summaryQuery,
    model,
    isLoading: summaryQuery.isLoading || (forecast.computing && !forecast.bundle),
    isError: summaryQuery.isError,
    refetch: summaryQuery.refetch
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function scoreHealth(input: { cashFlow: number; savingsRate: number; debtTotal: number; income: number; budgetUsed: number }) {
  let score = 55;
  if (input.cashFlow > 0) score += 12;
  if (input.cashFlow < 0) score -= 14;
  score += clamp(input.savingsRate * 0.4, 0, 15);
  if (input.debtTotal <= 0) score += 10;
  else if (input.income > 0 && input.debtTotal / (input.income * 12) > 0.4) score -= 12;
  if (input.budgetUsed > 100) score -= 10;
  else if (input.budgetUsed < 85) score += 6;
  return clamp(score, 0, 100);
}

function buildDashboardInsights(input: {
  workspaceInsights: FinanceInsight[];
  expenseTrend: number;
  savings: Array<{ goal: string; progress: number }>;
  upcoming: Array<{ title: string; daysUntil: number; kind: string }>;
  topCategory?: { name: string; value: number };
  debtFree: string | null;
  salaryTomorrow?: { title: string; daysUntil: number };
}): DashboardInsight[] {
  const out: DashboardInsight[] = [];

  if (input.expenseTrend < -5) {
    out.push({
      id: 'spend-down',
      title: `Spending ${Math.abs(input.expenseTrend).toFixed(0)}% less than last month`,
      detail: 'Your burn rate improved versus the prior month.',
      tone: 'good'
    });
  } else if (input.expenseTrend > 8) {
    out.push({
      id: 'spend-up',
      title: `Spending ${input.expenseTrend.toFixed(0)}% higher than last month`,
      detail: 'Review categories that jumped this period.',
      tone: 'warning'
    });
  }

  const emergency = input.savings.find((s) => /emergency/i.test(s.goal));
  if (emergency) {
    out.push({
      id: 'emergency',
      title: `Emergency fund is ${emergency.progress.toFixed(0)}% complete`,
      detail: 'Keep contributing to strengthen your runway.',
      tone: emergency.progress >= 70 ? 'good' : 'info'
    });
  }

  const dueSoon = input.upcoming.find((u) => u.kind === 'bill' && u.daysUntil >= 0 && u.daysUntil <= 7);
  if (dueSoon) {
    out.push({
      id: 'bill-due',
      title: `${dueSoon.title} due in ${dueSoon.daysUntil} day${dueSoon.daysUntil === 1 ? '' : 's'}`,
      detail: 'Make sure cash is available before the due date.',
      tone: dueSoon.daysUntil <= 2 ? 'warning' : 'info'
    });
  }

  if (input.salaryTomorrow && input.salaryTomorrow.daysUntil <= 1) {
    out.push({
      id: 'salary',
      title: input.salaryTomorrow.daysUntil <= 0 ? 'Income arrives today' : 'Salary arrives tomorrow',
      detail: input.salaryTomorrow.title,
      tone: 'good'
    });
  }

  const vacation = input.savings.find((s) => /vacation/i.test(s.goal));
  if (vacation && vacation.progress >= 80) {
    out.push({
      id: 'vacation',
      title: 'Vacation goal nearly complete',
      detail: `Progress at ${vacation.progress.toFixed(0)}% — finish line is close.`,
      tone: 'good'
    });
  }

  if (input.topCategory) {
    out.push({
      id: 'top-cat',
      title: `Highest expense category is ${input.topCategory.name}`,
      detail: 'Focus cuts here for the biggest monthly impact.',
      tone: 'info'
    });
  }

  if (input.debtFree) {
    out.push({
      id: 'debt-free',
      title: `Debt-free date projected ${input.debtFree}`,
      detail: 'From your Debt Center strategy simulation.',
      tone: 'good'
    });
  }

  for (const insight of input.workspaceInsights) {
    if (out.length >= 6) break;
    if (out.some((o) => o.id === insight.id)) continue;
    out.push({
      id: insight.id,
      title: insight.title,
      detail: insight.detail,
      tone: insight.tone
    });
  }

  return out.slice(0, 6);
}
