import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardPage from '../pages/DashboardPage';
import { useAuthStore } from '../store/auth';
import { getCurrentUser } from '../services/auth';
import ModulePage from '../pages/ModulePage';

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { initialized, setUser, setInitialized } = useAuthStore();

  useEffect(() => {
    getCurrentUser().then(setUser).finally(() => setInitialized(true));
  }, [setInitialized, setUser]);

  if (!initialized) return <div className="grid min-h-screen place-items-center text-slate-400">Loading FinancialOS…</div>;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthBootstrap>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="accounts" element={<ModulePage title="Accounts" description="Track your checking, savings, credit and investment accounts." />} />
        <Route path="transactions" element={<ModulePage title="Transactions" description="Import, create and categorize your financial activity." />} />
        <Route path="budget" element={<ModulePage title="Budget" description="Set monthly category limits and monitor spending." />} />
        <Route path="goals" element={<ModulePage title="Goals" description="Plan and fund the milestones that matter to you." />} />
        <Route path="debt" element={<ModulePage title="Debt Center" description="Prioritize payoff plans and payment due dates." />} />
        <Route path="forecast" element={<ModulePage title="Forecast" description="Model your future cash flow and financial outcomes." />} />
        <Route path="reports" element={<ModulePage title="Reports" description="Review your financial progress over time." />} />
        <Route path="settings" element={<ModulePage title="Settings" description="Manage your profile, currency and preferences." />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </AuthBootstrap>
  );
}

