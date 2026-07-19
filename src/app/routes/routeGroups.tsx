import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import {
  Calendar,
  CreditCard,
  FileText,
  FolderTree,
  LayoutDashboard,
  PiggyBank,
  ChartPie,
  MessageSquareText,
  ReceiptText,
  Repeat,
  Sparkles,
  Shield,
  TrendingUp,
  User,
  UserCog,
  Wallet,
  WalletCards,
  Target,
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
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const AdminProfilePage = lazy(() => import('@/pages/admin/AdminProfilePage'));
const AccessDeniedPage = lazy(() => import('@/pages/AccessDeniedPage'));
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
const GoalsPage = lazy(() => import('@/features/goals/GoalsPage'));
const BudgetPage = lazy(() => import('@/features/budget/BudgetPage'));
const NetWorthPage = lazy(() => import('@/features/networth/NetWorthPage'));
const InsightsPage = lazy(() => import('@/features/insights/InsightsPage'));
const FeedbackPage = lazy(() => import('@/features/feedback/FeedbackPage'));
const AdminFeedbackPage = lazy(() => import('@/features/feedback/AdminFeedbackPage'));
const ForecastPage = lazy(() => import('@/features/forecast/ForecastPage'));
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
  { path: '/dashboard', label: 'Dashboard', element: DashboardPage, end: true, icon: LayoutDashboard },
  { path: '/access-denied', label: 'Access Denied', element: AccessDeniedPage },
  { path: '/onboarding', label: 'Onboarding', element: OnboardingPage, icon: Sparkles },
  { path: '/profile', label: 'Profile', element: ProfilePage, icon: User },
  { path: '/accounts', label: 'Accounts', element: AccountsPage, icon: Wallet },
  { path: '/transactions', label: 'Transactions', element: TransactionsPage, icon: ReceiptText },
  { path: '/transactions/explorer', label: 'Transaction Explorer', element: TransactionExplorerPage },
  { path: '/categories', label: 'Categories', element: CategoriesPage, icon: FolderTree },
  { path: '/recurring', label: 'Recurring', element: RecurringPage, icon: Repeat },
  { path: '/calendar', label: 'Calendar', element: CalendarPage, icon: Calendar },
  { path: '/debt', label: 'Debt', element: DebtCenterPage, icon: CreditCard },
  { path: '/goals', label: 'Goals', element: GoalsPage, icon: Target },
  { path: '/budget', label: 'Monthly Budgets', element: BudgetPage, icon: ChartPie },
  { path: '/net-worth', label: 'Investments & Net Worth', element: NetWorthPage, icon: WalletCards },
  { path: '/insights', label: 'Financial News & AI', element: InsightsPage, icon: TrendingUp },
  { path: '/savings', label: 'Sinking Funds', element: SavingsPage, icon: PiggyBank },
  { path: '/forecast', label: 'Forecast', element: ForecastPage, icon: TrendingUp },
  { path: '/reports', label: 'Reports', element: ReportsPage, icon: FileText },
  { path: '/feedback', label: 'Feedback', element: FeedbackPage, icon: MessageSquareText }
];

export const adminRoutes: AppRoute[] = [
  { path: '/admin', label: 'System Health', element: AdminDashboardPage, end: true, icon: Shield },
  { path: '/admin/profile', label: 'Admin Profile', element: AdminProfilePage, icon: UserCog },
  { path: '/admin/feedback', label: 'Feedback Management', element: AdminFeedbackPage, icon: MessageSquareText }
];

export const routeGroups: RouteGroup[] = [
  { kind: 'public', routes: publicRoutes },
  { kind: 'protected', routes: protectedRoutes },
  { kind: 'admin', routes: adminRoutes }
];

export { ShellLayout };
export { NotFoundPage };
