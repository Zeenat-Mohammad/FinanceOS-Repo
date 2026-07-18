import type { AiInsightCard, EconomySnapshot, InvestmentHolding, PortfolioSummary } from '@/types/insights';

/** Deterministic insight engine — explains patterns; does not invent opaque math. */
export const InsightEngine = {
  build(params: {
    economy: EconomySnapshot;
    holdings: InvestmentHolding[];
    portfolio: PortfolioSummary;
    monthlyFoodSpend?: number;
    previousFoodSpend?: number;
    subscriptionSpend?: number;
    subscriptionBudget?: number;
    debtAprPct?: number;
    portfolioReturnPct?: number;
  }): AiInsightCard[] {
    const cards: AiInsightCard[] = [];
    const { economy, portfolio, holdings } = params;

    if (economy.inflationCurrent > economy.inflationAverage5y) {
      cards.push({
        id: 'inflation-buffer',
        severity: 'warning',
        title: 'Inflation is running above your 5-year average',
        explanation: `Current inflation prints at ${economy.inflationCurrent}% versus a ~${economy.inflationAverage5y}% recent average.`,
        suggestion: 'Increase your emergency fund target by 1–2 months of expenses while prices stay elevated.',
        tags: ['inflation', 'emergency-fund']
      });
    }

    if (params.monthlyFoodSpend != null && params.previousFoodSpend != null && params.previousFoodSpend > 0) {
      const delta = ((params.monthlyFoodSpend - params.previousFoodSpend) / params.previousFoodSpend) * 100;
      if (delta >= 10) {
        cards.push({
          id: 'food-spend',
          severity: 'warning',
          title: `Food spending increased ${delta.toFixed(0)}%`,
          explanation: 'Grocery and dining outlays rose versus the prior period.',
          suggestion: 'Set a weekly grocery cap and batch-cook two dinners to cut impulse spend.',
          tags: ['spending', 'food']
        });
      }
    }

    if (params.subscriptionSpend != null && params.subscriptionBudget != null && params.subscriptionSpend > params.subscriptionBudget) {
      cards.push({
        id: 'subs-over',
        severity: 'info',
        title: 'Subscriptions exceed your budget',
        explanation: `Recurring entertainment/tools are above the ${params.subscriptionBudget} budget line.`,
        suggestion: 'Pause one low-use subscription (e.g. streaming duplicate) for 30 days and reassess.',
        tags: ['subscriptions']
      });
    }

    if (params.debtAprPct != null && params.portfolioReturnPct != null && params.debtAprPct > params.portfolioReturnPct + 2) {
      cards.push({
        id: 'debt-vs-invest',
        severity: 'critical',
        title: 'Debt interest exceeds investment return',
        explanation: `High-APR debt (~${params.debtAprPct.toFixed(1)}%) is outrunning your portfolio return (~${params.portfolioReturnPct.toFixed(1)}%).`,
        suggestion: 'Redirect new investments to extra debt payments until the spread narrows.',
        tags: ['debt', 'portfolio']
      });
    }

    if (portfolio.totalReturnPct < 0) {
      cards.push({
        id: 'drawdown',
        severity: 'info',
        title: 'Portfolio is in drawdown',
        explanation: 'Mark-to-market value sits below cash invested.',
        suggestion: 'Review allocation concentration and avoid panic selling; rebalance only on plan.',
        tags: ['portfolio']
      });
    }

    const equityPct = portfolio.allocation.filter((a) => ['stocks', 'etf', 'mutual_funds'].includes(a.class)).reduce((s, a) => s + a.pct, 0);
    if (equityPct > 85) {
      cards.push({
        id: 'concentration',
        severity: 'warning',
        title: 'Equity concentration is very high',
        explanation: `About ${equityPct.toFixed(0)}% of the portfolio sits in equity-like assets.`,
        suggestion: 'Consider a cash or gold buffer for near-term expenses.',
        tags: ['allocation']
      });
    }

    if (holdings.length === 0) {
      cards.push({
        id: 'empty-portfolio',
        severity: 'positive',
        title: 'Start your investment track',
        explanation: 'Insights becomes sharper once holdings are linked.',
        suggestion: 'Add your first holding to unlock allocation, news personalization, and return tracking.',
        tags: ['onboarding']
      });
    }

    if (economy.interest.savings + 1 < economy.inflationCurrent) {
      cards.push({
        id: 'cash-drag',
        severity: 'info',
        title: 'Cash may be losing purchasing power',
        explanation: `Savings rates (~${economy.interest.savings}%) trail inflation (~${economy.inflationCurrent}%).`,
        suggestion: 'Park idle cash in the highest safe yield available, then invest surplus on schedule.',
        tags: ['cash', 'inflation']
      });
    }

    return cards.slice(0, 8);
  }
};
