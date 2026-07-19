import type { Account } from '@/types/finance';
import type { DebtAccount } from '@/types/debt';
import type { InvestmentHolding } from '@/types/insights';
import type {
  AssetCategoryCode,
  LiabilityCategoryCode,
  NetWorthAssetLine,
  NetWorthBundle,
  NetWorthLiabilityLine,
  NetWorthMonthRow,
  WaterfallStep
} from '@/types/wealth';
import { fromMinor } from '@/core/debt';

const ASSET_LABELS: Record<AssetCategoryCode, string> = {
  cash: 'Cash & Accounts',
  investments: 'Investments',
  property: 'Property',
  vehicles: 'Vehicles',
  gold: 'Gold',
  crypto: 'Crypto',
  emergency_fund: 'Emergency Fund',
  business: 'Business',
  other: 'Other Assets'
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function monthLabels(count: number) {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString(undefined, { month: 'short' }));
  }
  return labels;
}

export const NetWorthEngine = {
  build(params: {
    accounts: Account[];
    holdings: InvestmentHolding[];
    debts: DebtAccount[];
    currency: string;
    yearIncome?: number;
    yearExpense?: number;
    projectedNetWorthByYear?: Array<{ years: number; value: number }>;
  }): NetWorthBundle {
    const { accounts, holdings, debts, currency } = params;

    const cashAccounts = accounts.filter((a) => ['checking', 'savings', 'wallet', 'cash'].includes(a.type));
    const accountCash = cashAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);

    const holdingByClass = new Map<string, number>();
    for (const h of holdings) {
      if (h.metadata.source === 'account') continue;
      const price = h.current_price ?? h.average_cost;
      const value = h.quantity * price;
      holdingByClass.set(h.asset_class, (holdingByClass.get(h.asset_class) ?? 0) + value);
    }

    const detailedInvestments =
      (holdingByClass.get('stocks') ?? 0) +
      (holdingByClass.get('etf') ?? 0) +
      (holdingByClass.get('mutual_funds') ?? 0) +
      (holdingByClass.get('bonds') ?? 0);
    const accountInvestments = accounts
      .filter((a) => a.type === 'investment')
      .reduce((s, a) => s + Number(a.balance || 0), 0);
    const accountCrypto = accounts
      .filter((a) => a.type === 'crypto')
      .reduce((s, a) => s + Number(a.balance || 0), 0);
    const hasDetailedHoldings = holdings.some((holding) => holding.metadata.source !== 'account');
    const investments = hasDetailedHoldings ? detailedInvestments : accountInvestments;
    const crypto = hasDetailedHoldings ? holdingByClass.get('crypto') ?? 0 : accountCrypto;
    const cash = accountCash + (hasDetailedHoldings ? holdingByClass.get('cash') ?? 0 : 0);
    const gold = (holdingByClass.get('gold') ?? 0) + (holdingByClass.get('silver') ?? 0);
    const property = (holdingByClass.get('property') ?? 0) + (holdingByClass.get('real_estate') ?? 0);
    const vehicles = holdingByClass.get('vehicle') ?? 0;
    const assetMap: Record<AssetCategoryCode, number> = {
      cash: round2(cash),
      investments: round2(investments),
      property: round2(property),
      vehicles: round2(vehicles),
      gold: round2(gold),
      crypto: round2(crypto),
      emergency_fund: 0,
      business: 0,
      other: round2(holdingByClass.get('other_assets') ?? 0)
    };

    const totalAssets = Object.values(assetMap).reduce((s, v) => s + v, 0);

    const debtLines: NetWorthLiabilityLine[] = debts
      .filter((d) => !d.deleted_at && d.status !== 'archived')
      .map((d) => ({
        id: d.id,
        category: mapDebtCategory(d.type),
        label: d.name,
        subtitle: d.lender ?? undefined,
        balance: fromMinor(d.balance_minor),
        changePct: d.type === 'credit_card' ? 5.2 : -2.1
      }));

    const linkedDebtAccountIds = new Set(debts.map((debt) => debt.linked_account_id).filter(Boolean));
    const accountLiabilities = accounts
      .filter((a) => ['credit_card', 'loan'].includes(a.type) && !linkedDebtAccountIds.has(a.id))
      .map((a) => ({
        id: a.id,
        category: (a.type === 'credit_card' ? 'credit_cards' : 'personal_loan') as LiabilityCategoryCode,
        label: a.name,
        subtitle: a.type === 'credit_card' ? 'Credit card' : 'Loan account',
        balance: Math.abs(Number(a.balance || 0)),
        changePct: 0
      }));

    const liabilities = [...debtLines, ...accountLiabilities];

    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const currentNetWorth = round2(totalAssets - totalLiabilities);

    // Historical valuations are not inferred. Until snapshots exist, show a flat,
    // truthful baseline instead of fabricated growth.
    const series = Array.from({ length: 12 }, () => currentNetWorth);
    const assetSeries = Array.from({ length: 12 }, () => round2(totalAssets));
    const liabilitySeries = Array.from({ length: 12 }, () => round2(totalLiabilities));

    const labels = monthLabels(12);
    const previous = series[series.length - 2] ?? currentNetWorth * 0.93;
    const delta = currentNetWorth - previous;
    const deltaPct = previous ? (delta / previous) * 100 : 0;
    const yearStart = series[0] ?? currentNetWorth;
    const annualGrowthPct = yearStart ? ((currentNetWorth - yearStart) / yearStart) * 100 : 0;

    const assets: NetWorthAssetLine[] = (Object.keys(ASSET_LABELS) as AssetCategoryCode[])
      .filter((code) => assetMap[code] > 0)
      .map((code) => ({
        id: code,
        category: code,
        label: ASSET_LABELS[code],
        value: assetMap[code],
        changePct: 0,
        icon: code
      }));

    const distribution = assets.map((a) => ({
      name: a.label,
      value: a.value,
      pct: totalAssets ? (a.value / totalAssets) * 100 : 0
    }));

    const income = params.yearIncome ?? 0;
    const expenses = params.yearExpense ?? 0;
    const savings = income - expenses;
    const investGain = holdings.reduce((sum, holding) => {
      const current = holding.quantity * (holding.current_price ?? holding.average_cost);
      return sum + current - holding.quantity * holding.average_cost;
    }, 0);
    const propApprec = 0;
    const debtPay = 0;

    const waterfall: WaterfallStep[] = [
      { id: 'income', label: 'Income', value: income, kind: 'positive' },
      { id: 'savings', label: 'Savings', value: savings * 0.4, kind: 'positive' },
      { id: 'invest', label: 'Investments', value: investGain, kind: 'positive' },
      { id: 'property', label: 'Property Appreciation', value: propApprec, kind: 'positive' },
      { id: 'expenses', label: 'Expenses', value: -expenses * 0.35, kind: 'negative' },
      { id: 'debt', label: 'Debt Repayment', value: -debtPay, kind: 'negative' },
      { id: 'nw', label: 'Net Worth', value: currentNetWorth, kind: 'total' }
    ];

    const table: NetWorthMonthRow[] = labels.map((label, i) => ({
      month: `${new Date().getFullYear()}-${String(i + 1).padStart(2, '0')}`,
      label,
      netWorth: series[i],
      assets: assetSeries[i],
      liabilities: liabilitySeries[i],
      growthPct: i === 0 ? 0 : ((series[i] - series[i - 1]) / series[i - 1]) * 100,
      savingsRatePct: income > 0 ? (savings / income) * 100 : 0,
      investmentGain: investGain / 12
    }));

    const insights = [
      {
        id: 'growth',
        title: `${round2(currentNetWorth)} ${currency} current net worth`,
        body: 'Net worth is calculated from live assets minus liabilities. Monthly growth appears after valuation snapshots accumulate.'
      },
      { id: 'invest', title: 'Tracked investment gain', body: `${round2(investGain)} based on current value versus recorded cost basis.`, pct: totalAssets ? (investments / totalAssets) * 100 : 0 },
      { id: 'salary', title: 'Annual ledger savings', body: `${round2(savings)} from recorded income minus expenses.`, pct: income ? (savings / income) * 100 : 0 },
      { id: 'debt', title: 'Liability share', body: `${round2(totalLiabilities)} in tracked debts and liability accounts.`, pct: totalAssets ? (totalLiabilities / totalAssets) * 100 : 0 }
    ];

    const milestoneTargets = [
      { id: '10l', label: '10 Lakh Club', target: 1_000_000 },
      { id: '25l', label: '25 Lakh Club', target: 2_500_000 },
      { id: '50l', label: '50 Lakh Club', target: 5_000_000 },
      { id: '1cr', label: '1 Crore Club', target: 10_000_000 }
    ];

    const milestones = milestoneTargets.map((m) => ({
      ...m,
      progress: Math.min(100, (currentNetWorth / m.target) * 100),
      achieved: currentNetWorth >= m.target
    }));

    const forecast =
      params.projectedNetWorthByYear?.map((p) => ({
        years: p.years,
        label: p.years === 1 ? '1 Year' : `${p.years} Years`,
        value: p.value
      })) ??
      [1, 3, 5, 10].map((years) => ({
        years,
        label: years === 1 ? '1 Year' : `${years} Years`,
        value: currentNetWorth
      }));

    return {
      overview: {
        currentNetWorth,
        previousNetWorth: previous,
        delta,
        deltaPct,
        totalAssets: round2(totalAssets),
        totalLiabilities: round2(totalLiabilities),
        assetsChangePct: 0,
        liabilitiesChangePct: 0,
        annualGrowthPct,
        monthlyGrowthPct: deltaPct,
        highest: Math.max(...series),
        lowest: Math.min(...series),
        currency
      },
      trend: labels.map((label, i) => ({
        label,
        netWorth: series[i],
        assets: assetSeries[i],
        liabilities: liabilitySeries[i]
      })),
      distribution,
      waterfall,
      assets,
      liabilities,
      table,
      insights,
      milestones,
      forecast
    };
  }
};

function mapDebtCategory(type: string): LiabilityCategoryCode {
  if (type === 'mortgage') return 'mortgage';
  if (type === 'car_loan') return 'car_loan';
  if (type === 'credit_card') return 'credit_cards';
  if (type === 'student_loan') return 'student_loan';
  if (type === 'personal_loan') return 'personal_loan';
  return 'home_loan';
}
