import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import {
  Calendar,
  CreditCard,
  FileText,
  FolderTree,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  Repeat,
  Sparkles,
  Shield,
  User,
  Wallet,
} from 'lucide-react';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const SignupPage = lazy(() => import('@/features/auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/VerifyEmailPage'));
const EmailVerifiedPage = lazy(() => import('@/features/auth/EmailVerifiedPage'));
const EmailExpiredPage = lazy(() => import('@/features/auth/EmailExpiredPage'));
const EmailErrorPage = lazy(() => import('@/features/auth/EmailErrorPage'));
const NotFoundPage = lazy(() => import('@/features/placeholder/NotFoundPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const AdminDashboardPage = lazy(() => import('@/features/admin/AdminDashboardPage'));
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));
const AccountsPage = lazy(() => import('@/features/ledger/AccountsPage'));
const CategoriesPage = lazy(() => import('@/features/ledger/CategoriesPage'));
const TransactionsPage = lazy(() => import('@/features/ledger/TransactionsPage'));
const TransactionExplorerPage = lazy(() => import('@/features/ledger/TransactionExplorerPage'));
const RecurringPage = lazy(() => import('@/features/ledger/RecurringPage'));
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const DebtCenterPage = lazy(() => import('@/features/debt/DebtCenterPage'));
const SavingsPage = lazy(() => import('@/features/savings/SavingsPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const ShellLayout = lazy(() => import('@/features/shell/ShellLayout'));

export type RouteGroup = {
  kind: 'public' | 'protected' | 'admin';
  routes: AppRoute[];
};

export type AppRoute = {
  path: string;
  label: string;
  element: LazyExoticComponent<ComponentType>;
  nav?: boolean;
  end?: boolean;
  icon?: ComponentType<{ className?: string }>;
};

export const publicRoutes: AppRoute[] = [
  { path: '/', label: 'Landing', element: LandingPage },
  { path: '/login', label: 'Login', element: LoginPage },
  { path: '/signup', label: 'Signup', element: SignupPage },
  { path: '/forgot-password', label: 'Forgot Password', element: ForgotPasswordPage },
  { path: '/reset-password', label: 'Reset Password', element: ResetPasswordPage },
  { path: '/auth/verify-email', label: 'Verify Email', element: VerifyEmailPage },
  { path: '/auth/email-verified', label: 'Email Verified', element: EmailVerifiedPage },
  { path: '/auth/email-expired', label: 'Email Expired', element: EmailExpiredPage },
  { path: '/auth/email-error', label: 'Email Error', element: EmailErrorPage }
];

export const protectedRoutes: AppRoute[] = [
  { path: '/dashboard', label: 'Dashboard', element: DashboardPage, nav: true, end: true, icon: LayoutDashboard },
  { path: '/onboarding', label: 'Onboarding', element: OnboardingPage, nav: true, icon: Sparkles },
  { path: '/profile', label: 'Profile', element: ProfilePage, nav: true, icon: User },
  { path: '/accounts', label: 'Accounts', element: AccountsPage, nav: true, icon: Wallet },
  { path: '/transactions', label: 'Transactions', element: TransactionsPage, nav: true, icon: ReceiptText },
  { path: '/transactions/explorer', label: 'Transaction Explorer', element: TransactionExplorerPage },
  { path: '/categories', label: 'Categories', element: CategoriesPage, nav: true, icon: FolderTree },
  { path: '/recurring', label: 'Recurring', element: RecurringPage, nav: true, icon: Repeat },
  { path: '/calendar', label: 'Calendar', element: CalendarPage, nav: true, icon: Calendar },
  { path: '/debt', label: 'Debt', element: DebtCenterPage, nav: true, icon: CreditCard },
  { path: '/savings', label: 'Savings', element: SavingsPage, nav: true, icon: PiggyBank },
  { path: '/reports', label: 'Reports', element: ReportsPage, nav: true, icon: FileText }
];

export const adminRoutes: AppRoute[] = [
  { path: '/admin', label: 'Admin', element: AdminDashboardPage, nav: true, icon: Shield }
];

export const routeGroups: RouteGroup[] = [
  { kind: 'public', routes: publicRoutes },
  { kind: 'protected', routes: protectedRoutes },
  { kind: 'admin', routes: adminRoutes }
];

export { ShellLayout };
export { NotFoundPage };
