import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '../store/auth';
import { supabaseLoginEmail } from '../services/auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { setUser, setLoading, loading, error, setError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    setLoading(true);
    try {
      const user = await supabaseLoginEmail(values.email, values.password);
      setUser(user);
    } catch (e: any) {
      setError(e?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in with Supabase Auth.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="block">
            <span className="text-sm text-slate-300">Email</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              type="email"
              {...register('email')}
            />
            {errors.email && <div className="mt-1 text-xs text-red-400">{errors.email.message}</div>}
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">Password</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-sky-500"
              type="password"
              {...register('password')}
            />
            {errors.password && <div className="mt-1 text-xs text-red-400">{errors.password.message}</div>}
          </label>

          {error && <div className="text-sm text-red-400">{error}</div>}

          <button
            className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

