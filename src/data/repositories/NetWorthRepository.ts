import { format, startOfMonth, subMonths } from 'date-fns';
import { AccountsRepository } from '@/data/repositories/AccountsRepository';
import { DebtsRepository } from '@/data/repositories/DebtsRepository';
import { InvestmentRepository } from '@/data/repositories/insights/InvestmentRepository';
import { WealthRepository } from '@/data/repositories/WealthRepository';
import { TransactionsRepository } from '@/data/repositories/TransactionsRepository';
import { selectExpense, selectIncome } from '@/core/ledger/selectors';
import { NetWorthEngine } from '@/core/wealth/NetWorthEngine';
import { supabase } from '@/data/supabase/client';
import type { NetWorthBundle } from '@/types/wealth';

const SNAPSHOT_KEY = 'finlo.networth.snapshots.';

export const NetWorthRepository = {
  async loadBundle(params: {
    householdId: string;
    userId: string;
    currency: string;
    projectedNetWorthByYear?: Array<{ years: number; value: number }>;
  }): Promise<NetWorthBundle> {
    const [accounts, holdings, debts, wealth] = await Promise.all([
      AccountsRepository.list(),
      InvestmentRepository.list(params.householdId, params.userId, params.currency),
      DebtsRepository.list(params.householdId, params.userId),
      WealthRepository.getDashboardSummary(params.householdId)
    ]);

    const yearStart = format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd');
    const yearEnd = format(new Date(), 'yyyy-MM-dd');
    let yearIncome = 0;
    let yearExpense = 0;
    try {
      const data = await TransactionsRepository.listByPeriod(yearStart, yearEnd);
      yearIncome = selectIncome(data ?? []);
      yearExpense = selectExpense(data ?? []);
    } catch {
      // optional
    }

    const bundle = NetWorthEngine.build({
      accounts,
      holdings,
      debts,
      wealth,
      currency: params.currency,
      yearIncome,
      yearExpense,
      projectedNetWorthByYear: params.projectedNetWorthByYear
    });

    await this.persistSnapshot(params.householdId, bundle).catch(() => undefined);
    return bundle;
  },

  async persistSnapshot(householdId: string, bundle: NetWorthBundle) {
    const snapshotMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const row = {
      household_id: householdId,
      snapshot_month: snapshotMonth,
      net_worth: bundle.overview.currentNetWorth,
      total_assets: bundle.overview.totalAssets,
      total_liabilities: bundle.overview.totalLiabilities,
      growth_pct: bundle.overview.monthlyGrowthPct,
      savings_rate_pct: bundle.table.at(-1)?.savingsRatePct ?? null,
      investment_gain: bundle.table.at(-1)?.investmentGain ?? null,
      breakdown: {
        assets: bundle.assets,
        liabilities: bundle.liabilities
      }
    };

    try {
      const key = SNAPSHOT_KEY + householdId;
      const prev = JSON.parse(localStorage.getItem(key) ?? '[]') as unknown[];
      const next = [row, ...prev.filter((r) => (r as { snapshot_month?: string }).snapshot_month !== snapshotMonth)].slice(0, 60);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }

    await supabase.from('networth_snapshots').upsert(row, { onConflict: 'household_id,snapshot_month' });
  }
};
