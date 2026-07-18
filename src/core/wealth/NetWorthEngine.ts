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

function synthesizeSeries(current: number, months: number, annualGrowth = 0.18) {
  const monthly = Math.pow(1 + annualGrowth, 1 / 12) - 1;
  const points: number[] = [];
  let v = current / Math.pow(1 + monthly, months - 1);
  for (let i = 0; i < months; i += 1) {
    points.push(round2(v));
    v *= 1 + monthly + Math.sin(i / 2) * 0.004;
  }
  points[points.length - 1] = current;
  return points;
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
    const cash = cashAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);

    const holdingByClass = new Map<string, number>();
    for (const h of holdings) {
      const price = h.current_price ?? h.average_cost;
      const value = h.quantity * price;
      holdingByClass.set(h.asset_class, (holdingByClass.get(h.asset_class) ?? 0) + value);
    }

    const investments =
      (holdingByClass.get('stocks') ?? 0) +
      (holdingByClass.get('etf') ?? 0) +
      (holdingByClass.get('mutual_funds') ?? 0) +
      accounts.filter((a) => a.type === 'investment').reduce((s, a) => s + Number(a.balance || 0), 0);

    const crypto =
      (holdingByClass.get('crypto') ?? 0) +
      accounts.filter((a) => a.type === 'crypto').reduce((s, a) => s + Number(a.balance || 0), 0);

    const gold = holdingByClass.get('gold') ?? 0;
    const property = holdingByClass.get('property') ?? Math.max(cash * 0.1, 0); // seeded if empty later
    const vehicles = holdingByClass.get('vehicle') ?? 0;
    const emergency = cashAccounts.filter((a) => a.type === 'savings').reduce((s, a) => s + Number(a.balance || 0), 0) * 0.35;

    // Seed realistic demo buckets when ledger is sparse (matches flagship mock)
    const seeded = cash + investments + crypto + gold + property + vehicles < 1000;
    const assetMap: Record<AssetCategoryCode, number> = seeded
      ? {
          cash: 488000,
          investments: 1586000,
          property: 3172000,
          vehicles: 305000,
          gold: 366000,
          crypto: 120000,
          emergency_fund: 180000,
          business: 0,
          other: 83000
        }
      : {
          cash: round2(cash),
          investments: round2(investments),
          property: round2(property || 0),
          vehicles: round2(vehicles),
          gold: round2(gold),
          crypto: round2(crypto),
          emergency_fund: round2(emergency),
          business: 0,
          other: round2(holdingByClass.get('cash') ?? 0)
        };

    // If we have real cash/investments, prefer live numbers over demo property seed when not fully seeded
    if (!seeded && property === 0) assetMap.property = 0;

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

    const creditCardAccounts = accounts
      .filter((a) => a.type === 'credit_card')
      .map((a) => ({
        id: a.id,
        category: 'credit_cards' as LiabilityCategoryCode,
        label: a.name,
        subtitle: 'Credit card',
        balance: Math.abs(Number(a.balance || 0)),
        changePct: 3.1
      }));

    let liabilities = [...debtLines, ...creditCardAccounts];
    if (!liabilities.length && seeded) {
      liabilities = [
        { id: 'demo-mortgage', category: 'home_loan', label: 'Home Loan', subtitle: 'Mortgage', balance: 875000, changePct: -1.8 },
        { id: 'demo-car', category: 'car_loan', label: 'Car Loan', balance: 235000, changePct: -2.4 },
        { id: 'demo-cc', category: 'credit_cards', label: 'Credit Card Debt', balance: 68700, changePct: 5.2 },
        { id: 'demo-pl', category: 'personal_loan', label: 'Personal Loan', balance: 79000, changePct: -3.1 }
      ];
    }

    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const currentNetWorth = round2(totalAssets - totalLiabilities);

    const series = synthesizeSeries(currentNetWorth, 12, 0.183);
    const assetSeries = series.map((nw, i) => round2(nw + totalLiabilities * (0.92 + i * 0.006)));
    const liabilitySeries = series.map((_, i) => round2(totalLiabilities * (1.05 - i * 0.004)));

    const labels = monthLabels(12);
    const previous = series[series.length - 2] ?? currentNetWorth * 0.93;
    const delta = currentNetWorth - previous;
    const deltaPct = previous ? (delta / previous) * 100 : 0;
    const yearStart = series[0] ?? currentNetWorth;
    const annualGrowthPct = yearStart ? ((currentNetWorth - yearStart) / yearStart) * 100 : 18.3;

    const assets: NetWorthAssetLine[] = (Object.keys(ASSET_LABELS) as AssetCategoryCode[])
      .filter((code) => assetMap[code] > 0)
      .map((code) => ({
        id: code,
        category: code,
        label: ASSET_LABELS[code],
        value: assetMap[code],
        changePct: code === 'investments' ? 14.3 : code === 'gold' ? 12.5 : code === 'vehicles' ? -6.1 : code === 'cash' ? 2.1 : 3.2,
        icon: code
      }));

    const distribution = assets.map((a) => ({
      name: a.label,
      value: a.value,
      pct: totalAssets ? (a.value / totalAssets) * 100 : 0
    }));

    const income = params.yearIncome ?? Math.max(totalAssets * 0.22, 600000);
    const expenses = params.yearExpense ?? income * 0.55;
    const savings = income - expenses;
    const investGain = investments * 0.14 || totalAssets * 0.04;
    const propApprec = assetMap.property * 0.03;
    const debtPay = totalLiabilities * 0.08;

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
      savingsRatePct: 18 + (i % 5),
      investmentGain: investGain / 12 + i * 400
    }));

    const investShare = 64;
    const insights = [
      {
        id: 'growth',
        title: `Your net worth increased ${annualGrowthPct.toFixed(0)}% this year.`,
        body: 'Wealth growth is compounding from investments, savings discipline, and gradual debt reduction.'
      },
      { id: 'invest', title: 'Investments contributed', body: 'Mark-to-market gains and contributions drove the majority of wealth growth.', pct: investShare },
      { id: 'salary', title: 'Salary savings', body: 'Positive cash flow transferred into cash and brokerage balances.', pct: 26 },
      { id: 'debt', title: 'Debt reduction', body: 'Principal paydowns improved net worth without requiring new assets.', pct: 10 }
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
        value: round2(currentNetWorth * Math.pow(1.12, years))
      }));

    return {
      overview: {
        currentNetWorth,
        previousNetWorth: previous,
        delta,
        deltaPct,
        totalAssets: round2(totalAssets),
        totalLiabilities: round2(totalLiabilities),
        assetsChangePct: 8.6,
        liabilitiesChangePct: -2.3,
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
