import { useAuthStore } from '../store/auth';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <section>
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2 text-slate-400 text-sm">
        {user ? `Signed in as ${user.email}` : 'Not signed in'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">Overall Score</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">Cash Flow</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="text-sm text-slate-400">Net Worth</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/30 p-4">
        <div className="text-sm text-slate-400">Starter module</div>
        <div className="mt-2 text-sm text-slate-200">
          Add Accounts / Transactions / Budget engines next.
        </div>
      </div>
    </section>
  );
}

