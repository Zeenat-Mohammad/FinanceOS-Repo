import { Outlet, NavLink } from 'react-router-dom';
import { supabaseLogout } from '../services/auth';
import { useAuthStore } from '../store/auth';

export default function DashboardLayout() {
  const setUser = useAuthStore((state) => state.setUser);
  const links = [
    ['/', 'Dashboard'], ['accounts', 'Accounts'], ['transactions', 'Transactions'], ['budget', 'Budget'],
    ['goals', 'Goals'], ['debt', 'Debt'], ['forecast', 'Forecast'], ['reports', 'Reports'], ['settings', 'Settings']
  ];

  async function signOut() {
    await supabaseLogout();
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight">FinancialOS</div>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-slate-300">
            {links.map(([to, label]) => (
              <NavLink key={to} className={({ isActive }) => (isActive ? 'text-sky-300' : undefined)} to={to} end={to === '/'}>
                {label}
              </NavLink>
            ))}
            <button className="text-slate-400 hover:text-white" onClick={signOut}>Sign out</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

