export type SearchSection =
  | 'transactions'
  | 'categories'
  | 'accounts'
  | 'goals'
  | 'budgets'
  | 'debts'
  | 'investments'
  | 'assets'
  | 'crypto'
  | 'loans'
  | 'credit_cards'
  | 'reports';

export type SearchResultItem = {
  id: string;
  section: SearchSection;
  title: string;
  subtitle: string;
  amount?: number | null;
  date?: string | null;
  href: string;
  score: number;
};

export type GroupedSearchResults = {
  section: SearchSection;
  label: string;
  items: SearchResultItem[];
};

export const SEARCH_SECTION_LABELS: Record<SearchSection, string> = {
  transactions: 'Transactions',
  categories: 'Categories',
  accounts: 'Accounts',
  goals: 'Goals',
  budgets: 'Budgets',
  debts: 'Debts',
  investments: 'Investments',
  assets: 'Assets',
  crypto: 'Crypto',
  loans: 'Loans',
  credit_cards: 'Credit Cards',
  reports: 'Reports'
};

export const SEARCH_SECTION_ORDER: SearchSection[] = [
  'transactions',
  'categories',
  'accounts',
  'goals',
  'budgets',
  'debts',
  'investments',
  'assets',
  'crypto',
  'loans',
  'credit_cards',
  'reports'
];
