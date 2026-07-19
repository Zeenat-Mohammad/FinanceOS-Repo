import type { ComponentType } from 'react';
import {
  ChartPie,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  LineChart,
  MessageSquareText,
  Newspaper,
  PiggyBank,
  ReceiptText,
  Repeat,
  Shield,
  Target,
  User,
  Wallet,
  WalletCards
} from 'lucide-react';

export type NavItem = {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
};

export const navGroups: NavGroup[] = [
  {
    id: 'home',
    label: 'Home',
    items: [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true }]
  },
  {
    id: 'finances',
    label: 'Finances',
    items: [
      { path: '/accounts', label: 'Accounts', icon: Wallet },
      { path: '/transactions', label: 'Transactions', icon: ReceiptText },
      { path: '/categories', label: 'Categories', icon: FolderTree },
      { path: '/budget', label: 'Monthly Budgets', icon: ChartPie },
      { path: '/recurring', label: 'Recurring', icon: Repeat }
    ]
  },
  {
    id: 'planning',
    label: 'Planning',
    items: [
      { path: '/goals', label: 'Goals', icon: Target },
      { path: '/savings', label: 'Sinking Funds', icon: PiggyBank },
      { path: '/debt', label: 'Debt', icon: CreditCard },
      { path: '/forecast', label: 'Forecast', icon: LineChart }
    ]
  },
  {
    id: 'wealth',
    label: 'Wealth',
    items: [{ path: '/net-worth', label: 'Investments & Net Worth', icon: WalletCards }]
  },
  {
    id: 'tools',
    label: 'Tools',
    items: [
      { path: '/insights', label: 'Financial News & AI', icon: Newspaper },
      { path: '/feedback', label: 'Feedback', icon: MessageSquareText }
    ]
  },
  {
    id: 'profile',
    label: 'Profile',
    items: [{ path: '/profile', label: 'Profile', icon: User }]
  },
  {
    id: 'admin',
    label: 'Admin',
    adminOnly: true,
    items: [
      { path: '/admin/feedback', label: 'Feedback Management', icon: MessageSquareText },
      { path: '/admin', label: 'System Health', icon: Shield }
    ]
  }
];

export const allowedDuringOnboarding = new Set(['/onboarding']);

export function flattenNavItems(isAdmin: boolean) {
  return navGroups
    .filter((group) => !group.adminOnly || isAdmin)
    .flatMap((group) => group.items);
}
