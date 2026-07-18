import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { supabaseLoginEmail } from './authService';
import { useAuthStore } from './authStore';
import { BrandLogo, Button } from '@/shared/components';
import { toAppError } from '@/shared/errors';
import { PasswordInput } from './PasswordInput';
import { AuthScene } from './AuthScene';
import { isAppAdmin } from '@/features/admin/adminAccess';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean()
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, profile, initializationStatus, setLoading, loading, error, setError } = useAuthStore();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      rememberMe: true
    }
  });

  if (user && initializationStatus === 'ready') {
    if (isAppAdmin(user)) {
      return <Navigate to={from === '/dashboard' || from === '/onboarding' ? '/admin' : from} replace />;
    }

    return <Navigate to={profile?.onboarding_completed ? from : '/onboarding'} replace />;
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    setLoading(true);

    try {
      await supabaseLoginEmail(values.email, values.password, values.rememberMe);
    } catch (err) {
      setError(toAppError(err).userMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScene cardClassName="max-w-[560px]">
      <BrandLogo className="mb-6" />
      <h1 className="text-xl font-semibold">Login</h1>
      <p className="mt-1 text-sm text-muted">Sign in with Supabase Auth.</p>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <label className="block">
          <span className="text-sm text-muted">Email</span>
          <input
            className="input mt-1.5"
            type="email"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email ? <div className="mt-1 text-xs text-destructive">{errors.email.message}</div> : null}
        </label>

        <PasswordInput label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />

        <label className="flex items-center gap-2 text-sm text-muted">
          <input className="h-4 w-4 rounded border-border bg-white accent-accent" type="checkbox" {...register('rememberMe')} />
          Remember me
        </label>

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link className="text-success hover:text-accent" to="/forgot-password">
          Forgot password?
        </Link>
        <Link className="text-muted hover:text-primary" to="/signup">
          Create account
        </Link>
      </div>
    </AuthScene>
  );
}
