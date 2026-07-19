import { format, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/data/supabase/client';
import type { Category, Transaction } from '@/types/finance';
import type { MonthlyBudgetRecord } from '@/types/wealth';
import { throwDatabaseError } from './repositoryError';

export const DEFAULT_BUDGET_CATEGORIES = [
  'Housing', 'Food', 'Transport', 'Shopping', 'Insurance', 'Utilities',
  'Health', 'Savings', 'Investment', 'Debt', 'Education', 'Entertainment',
  'Travel', 'Business', 'Miscellaneous'
] as const;

export type MonthlyBudgetBundle = {
  year: number;
  month: number;
  label: string;
  rows: MonthlyBudgetRecord[];
  totals: { allocated: number; spent: number; remaining: number; forecast: number };
};

function monthLabel(year: number, month: number) {
  return format(new Date(year, month, 1), 'MMMM yyyy');
}

function deriveSpentByCategory(transactions: Transaction[], categories: Category[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const spent = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== 'expense' && tx.type !== 'refund') continue;
    const category = tx.category_id ? categoryById.get(tx.category_id) : null;
    const name = category?.name ?? 'Miscellaneous';
    const amount = tx.type === 'refund' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
    spent.set(name, (spent.get(name) ?? 0) + amount);
  }
  return spent;
}

export const MonthlyBudgetRepository = {
  async getBundle(householdId: string, userId: string, cursor = new Date()): Promise<MonthlyBudgetBundle> {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const start = format(startOfMonth(cursor), 'yyyy-MM-dd');
    const end = format(endOfMonth(cursor), 'yyyy-MM-dd');

    const [{ data: budgets, error: budgetError }, transactions, categories] = await Promise.all([
      supabase
        .from('monthly_budgets')
        .select('*')
        .eq('household_id', householdId)
        .eq('budget_year', year)
        .eq('budget_month', month)
        .is('deleted_at', null)
        .order('category_name'),
      import('./TransactionsRepository').then((m) => m.TransactionsRepository.listByPeriod(start, end)),
      import('./CategoriesRepository').then((m) => m.CategoriesRepository.list())
    ]);

    if (budgetError) throwDatabaseError('Failed to load monthly budgets', budgetError);

    const spentByCategory = deriveSpentByCategory(transactions, categories);
    let rows = (budgets ?? []) as MonthlyBudgetRecord[];

    if (!rows.length) {
      rows = DEFAULT_BUDGET_CATEGORIES.map((categoryName, index) => {
        const spent = spentByCategory.get(categoryName) ?? 0;
        return {
          id: `draft-${year}-${month}-${index}`,
          household_id: householdId,
          user_id: userId,
          category_id: categories.find((c) => c.name === categoryName)?.id ?? null,
          category_name: categoryName,
          budget_year: year,
          budget_month: month,
          allocated: 0,
          spent,
          remaining: -spent,
          forecast: spent,
          carry_forward: 0,
          status: 'draft' as const,
          notes: null,
          attachments: [],
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          version: 1
        };
      });
    } else {
      rows = rows.map((row) => {
        const spent = spentByCategory.get(row.category_name) ?? row.spent;
        const remaining = row.allocated - spent;
        return { ...row, spent, remaining, forecast: Math.max(spent, row.forecast) };
      });
    }

    const totals = rows.reduce(
      (acc, row) => ({
        allocated: acc.allocated + row.allocated,
        spent: acc.spent + row.spent,
        remaining: acc.remaining + row.remaining,
        forecast: acc.forecast + row.forecast
      }),
      { allocated: 0, spent: 0, remaining: 0, forecast: 0 }
    );

    return { year, month, label: monthLabel(year, month), rows, totals };
  },

  async upsertRow(input: Omit<MonthlyBudgetRecord, 'id' | 'created_at' | 'updated_at' | 'version' | 'deleted_at'> & { id?: string }) {
    const payload = {
      household_id: input.household_id,
      user_id: input.user_id,
      category_id: input.category_id,
      category_name: input.category_name,
      budget_year: input.budget_year,
      budget_month: input.budget_month,
      allocated: input.allocated,
      spent: input.spent,
      remaining: input.remaining,
      forecast: input.forecast,
      carry_forward: input.carry_forward,
      status: input.status,
      notes: input.notes,
      attachments: input.attachments,
      metadata: input.metadata
    };

    const { data, error } = await supabase
      .from('monthly_budgets')
      .upsert(payload, { onConflict: 'household_id,budget_year,budget_month,category_name' })
      .select('*')
      .single();
    if (error) throwDatabaseError('Failed to save monthly budget row', error);
    return data as MonthlyBudgetRecord;
  },

  async copyPreviousMonth(householdId: string, userId: string, cursor = new Date()) {
    const prev = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const prevBundle = await this.getBundle(householdId, userId, prev);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    for (const row of prevBundle.rows) {
      await this.upsertRow({
        household_id: householdId,
        user_id: userId,
        category_id: row.category_id,
        category_name: row.category_name,
        budget_year: year,
        budget_month: month,
        allocated: row.allocated,
        spent: 0,
        remaining: row.allocated,
        forecast: 0,
        carry_forward: row.remaining,
        status: 'active',
        notes: row.notes ?? null,
        attachments: row.attachments,
        metadata: row.metadata
      });
    }
  },

  async archiveMonth(householdId: string, year: number, month: number) {
    const { error } = await supabase
      .from('monthly_budgets')
      .update({ status: 'archived' })
      .eq('household_id', householdId)
      .eq('budget_year', year)
      .eq('budget_month', month);
    if (error) throwDatabaseError('Failed to archive monthly budget', error);
  }
};
