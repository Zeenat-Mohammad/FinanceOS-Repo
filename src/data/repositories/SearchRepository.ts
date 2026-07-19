import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { AccountsRepository } from './AccountsRepository';
import { CategoriesRepository } from './CategoriesRepository';
import { TransactionsRepository } from './TransactionsRepository';
import { GoalsRepository } from './GoalsRepository';
import { DebtsRepository } from './DebtsRepository';
import { MonthlyBudgetRepository } from './MonthlyBudgetRepository';
import { WealthRepository } from './WealthRepository';
import { ReportsRepository } from './ReportsRepository';
import { GlobalSearchService } from '@/core/search/GlobalSearchService';
import type { SearchResultItem } from '@/core/search/types';

export const SearchRepository = {
  async search(householdId: string, userId: string, query: string, currency = 'USD'): Promise<SearchResultItem[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const now = new Date();
    const start = format(startOfMonth(subMonths(now, 12)), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');

    const [
      accounts,
      categories,
      transactions,
      goals,
      debtState,
      budgetBundle,
      wealth,
      reportMonths
    ] = await Promise.all([
      AccountsRepository.list().catch(() => []),
      CategoriesRepository.list().catch(() => []),
      TransactionsRepository.listByPeriod(start, end).catch(() => []),
      GoalsRepository.list(householdId).catch(() => []),
      DebtsRepository.getState(householdId, userId).catch(() => null),
      MonthlyBudgetRepository.getBundle(householdId, userId, now).catch(() => null),
      WealthRepository.getDashboardSummary(householdId).catch(() => ({
        investments: [],
        assets: [],
        crypto: [],
        loans: [],
        credit_cards: [],
        monthly_budgets: []
      })),
      ReportsRepository.listMonthsForYear(now.getFullYear(), currency).catch(() => [])
    ]);

    const items: SearchResultItem[] = [];

    for (const account of accounts.filter((row) => !row.deleted_at && !row.is_archived)) {
      items.push({
        id: account.id,
        section: 'accounts',
        title: account.name,
        subtitle: `${account.type} account`,
        amount: account.balance ?? account.opening_balance ?? 0,
        href: `/accounts?focus=${account.id}`,
        score: 0
      });
    }

    for (const category of categories.filter((row) => !row.deleted_at)) {
      items.push({
        id: category.id,
        section: 'categories',
        title: category.name,
        subtitle: `${category.type} category`,
        href: `/categories?focus=${category.id}`,
        score: 0
      });
    }

    for (const tx of transactions.slice(0, 250)) {
      items.push({
        id: tx.id,
        section: 'transactions',
        title: tx.merchant || tx.description || 'Transaction',
        subtitle: tx.description || tx.type,
        amount: tx.amount,
        date: tx.date,
        href: `/transactions?search=${encodeURIComponent(tx.merchant || tx.description || '')}`,
        score: 0
      });
    }

    for (const goal of goals.filter((row) => !row.deleted_at)) {
      items.push({
        id: goal.id,
        section: 'goals',
        title: goal.name,
        subtitle: `${goal.goal_type.replaceAll('_', ' ')} · ${goal.status}`,
        amount: goal.target_amount,
        date: goal.target_date ?? undefined,
        href: `/goals?focus=${goal.id}`,
        score: 0
      });
    }

    for (const row of budgetBundle?.rows ?? []) {
      items.push({
        id: row.id,
        section: 'budgets',
        title: row.category_name,
        subtitle: `${budgetBundle?.label ?? 'Monthly budget'} · spent ${row.spent}`,
        amount: row.allocated,
        href: '/budget',
        score: 0
      });
    }

    for (const debt of debtState?.debts.filter((row) => !row.deleted_at && row.status === 'active') ?? []) {
      items.push({
        id: debt.id,
        section: 'debts',
        title: debt.name,
        subtitle: `${debt.type.replaceAll('_', ' ')} · ${debt.lender ?? 'Lender'}`,
        amount: debt.balance_minor / 100,
        href: `/debt?focus=${debt.id}`,
        score: 0
      });
    }

    for (const investment of wealth.investments) {
      items.push({
        id: investment.id,
        section: 'investments',
        title: investment.name,
        subtitle: `${investment.investment_type}${investment.ticker ? ` · ${investment.ticker}` : ''}`,
        amount: investment.quantity * investment.current_price,
        href: '/net-worth?tab=investments',
        score: 0
      });
    }

    for (const asset of wealth.assets) {
      items.push({
        id: asset.id,
        section: 'assets',
        title: asset.name,
        subtitle: asset.asset_type.replaceAll('_', ' '),
        amount: asset.estimated_value,
        href: '/net-worth?tab=assets',
        score: 0
      });
    }

    for (const coin of wealth.crypto) {
      items.push({
        id: coin.id,
        section: 'crypto',
        title: coin.coin_name,
        subtitle: `${coin.ticker}${coin.exchange ? ` · ${coin.exchange}` : ''}`,
        amount: coin.quantity * coin.current_price,
        href: '/net-worth?tab=crypto',
        score: 0
      });
    }

    for (const loan of wealth.loans) {
      items.push({
        id: loan.id,
        section: 'loans',
        title: loan.name,
        subtitle: `${loan.loan_type.replaceAll('_', ' ')}${loan.lender ? ` · ${loan.lender}` : ''}`,
        amount: loan.remaining_balance,
        href: '/net-worth?tab=loans',
        score: 0
      });
    }

    for (const card of wealth.credit_cards) {
      items.push({
        id: card.id,
        section: 'credit_cards',
        title: card.card_name,
        subtitle: card.bank ?? 'Credit card',
        amount: card.outstanding_balance,
        href: '/net-worth?tab=credit-cards',
        score: 0
      });
    }

    for (const month of reportMonths.slice(0, 24)) {
      items.push({
        id: month.key,
        section: 'reports',
        title: month.label,
        subtitle: 'Monthly report · export PDF/CSV',
        amount: month.net,
        href: `/reports?month=${encodeURIComponent(month.key)}`,
        score: 0
      });
    }

    return GlobalSearchService.finalize(q, items);
  }
};
