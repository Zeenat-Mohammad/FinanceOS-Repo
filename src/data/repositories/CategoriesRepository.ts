import { supabase } from '@/data/supabase/client';
import type { Category, Json, TransactionType } from '@/types/finance';
import { throwDatabaseError } from './repositoryError';

export type CategoryInput = {
  household_id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  parent_id?: string | null;
  icon?: string | null;
  color?: string | null;
  sort_order?: number;
  metadata?: Json;
};

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

export function isCategoryArchived(category: Category): boolean {
  return asRecord(category.metadata).archived === true;
}

export function getCategoryMeta(category: Category) {
  const meta = asRecord(category.metadata);
  return {
    description: typeof meta.description === 'string' ? meta.description : '',
    budget: typeof meta.budget === 'number' ? meta.budget : 0,
    budgetApplicable: meta.budget_applicable === true,
    defaultCategory: meta.default_category === true,
    recurringAllowed: meta.recurring_allowed !== false,
    archivedAt: typeof meta.archived_at === 'string' ? meta.archived_at : null
  };
}

export const CategoriesRepository = {
  async list(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').is('deleted_at', null).order('sort_order').order('name');

    if (error) throwDatabaseError('Failed to load categories', error);

    return (data ?? []) as Category[];
  },

  async listByType(type: TransactionType): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').eq('type', type).is('deleted_at', null).order('name');

    if (error) throwDatabaseError('Failed to load categories by type', error);

    return (data ?? []) as Category[];
  },

  async create(input: CategoryInput): Promise<Category> {
    const { data, error } = await supabase.from('categories').insert(input).select('*').single();

    if (error) throwDatabaseError('Failed to create category', error);

    return data as Category;
  },

  async update(categoryId: string, input: Partial<Omit<CategoryInput, 'household_id' | 'user_id'>>): Promise<Category> {
    const { data, error } = await supabase.from('categories').update(input).eq('id', categoryId).select('*').single();

    if (error) throwDatabaseError('Failed to update category', error);

    return data as Category;
  },

  async archive(categoryId: string): Promise<Category> {
    const { data: current, error: loadError } = await supabase.from('categories').select('metadata').eq('id', categoryId).maybeSingle();
    if (loadError) throwDatabaseError('Failed to load category', loadError);

    const metadata = {
      ...asRecord((current?.metadata ?? {}) as Json),
      archived: true,
      archived_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('categories').update({ metadata }).eq('id', categoryId).select('*').single();
    if (error) throwDatabaseError('Failed to archive category', error);
    return data as Category;
  },

  async restore(categoryId: string): Promise<Category> {
    const { data: current, error: loadError } = await supabase.from('categories').select('metadata').eq('id', categoryId).maybeSingle();
    if (loadError) throwDatabaseError('Failed to load category', loadError);

    const metadata = { ...asRecord((current?.metadata ?? {}) as Json) };
    delete metadata.archived;
    delete metadata.archived_at;

    const { data, error } = await supabase.from('categories').update({ metadata }).eq('id', categoryId).select('*').single();
    if (error) throwDatabaseError('Failed to restore category', error);
    return data as Category;
  },

  async remove(categoryId: string): Promise<void> {
    const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', categoryId);

    if (error) throwDatabaseError('Failed to delete category', error);
  },

  async ensureDefaultCategories(input: { household_id: string; user_id: string }): Promise<Category[]> {
    const existing = await this.list();
    const householdCategories = existing.filter((category) => category.household_id === input.household_id);
    const missing = defaultCategories.filter(
      (category) => !householdCategories.some((existingCategory) => existingCategory.name === category.name && existingCategory.type === category.type)
    );

    if (missing.length === 0) return householdCategories;

    const { data, error } = await supabase
      .from('categories')
      .insert(
        missing.map((category) => ({
          household_id: input.household_id,
          user_id: input.user_id,
          ...category,
          metadata: { seeded: true, repairedByClient: true }
        }))
      )
      .select('*');

    if (error) throwDatabaseError('Failed to repair missing default categories', error);

    return [...householdCategories, ...((data ?? []) as Category[])];
  }
};

const defaultCategories: Array<Pick<CategoryInput, 'name' | 'type' | 'color' | 'icon'>> = [
  { name: 'Income', type: 'income', color: '#B6D7A8', icon: 'wallet' },
  { name: 'Expense', type: 'expense', color: '#B4A7D6', icon: 'receipt' },
  { name: 'Transfer', type: 'transfer', color: '#3A9D9D', icon: 'repeat' },
  { name: 'Investment', type: 'expense', color: '#B4A7D6', icon: 'trending-up' },
  { name: 'Debt', type: 'expense', color: '#B4A7D6', icon: 'credit-card' },
  { name: 'Utilities', type: 'expense', color: '#3A9D9D', icon: 'zap' },
  { name: 'Food', type: 'expense', color: '#B6D7A8', icon: 'utensils' },
  { name: 'Transportation', type: 'expense', color: '#3A9D9D', icon: 'car' },
  { name: 'Housing', type: 'expense', color: '#474F7A', icon: 'home' },
  { name: 'Healthcare', type: 'expense', color: '#B4A7D6', icon: 'heart' },
  { name: 'Shopping', type: 'expense', color: '#B4A7D6', icon: 'shopping-bag' },
  { name: 'Entertainment', type: 'expense', color: '#3A9D9D', icon: 'clapperboard' },
  { name: 'Education', type: 'expense', color: '#B6D7A8', icon: 'graduation-cap' },
  { name: 'Travel', type: 'expense', color: '#3A9D9D', icon: 'plane' },
  { name: 'Insurance', type: 'expense', color: '#474F7A', icon: 'shield' },
  { name: 'Subscriptions', type: 'expense', color: '#B4A7D6', icon: 'tv' },
  { name: 'Savings', type: 'expense', color: '#B6D7A8', icon: 'landmark' },
  { name: 'Salary', type: 'income', color: '#B6D7A8', icon: 'briefcase' }
];
