import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabaseSignUpEmail } from './authService';
import { useAuthStore } from './authStore';
import { BrandLogo, Button, Card } from '@/shared/components';
import { toAppError } from '@/shared/errors';
import { PasswordInput } from './PasswordInput';
import { getPasswordChecks, passwordSchema } from './passwordValidation';
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS } from '@/core/locale/options';

const currencyCodes = CURRENCY_OPTIONS.map((c) => c.code) as [string, ...string[]];

const schema = z
  .object({
    fullName: z.string().min(2, 'Enter your name'),
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    country: z.string().min(1, 'Select your country'),
    currency: z.enum(currencyCodes, { message: 'Select a currency' })
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const { user, initializationStatus, setAuthStatus, setLoading, loading, error, setError } = useAuthStore();
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      country: 'US',
      currency: 'USD'
    }
  });
  const password = form.watch('password') ?? '';

  if (user && initializationStatus === 'ready') {
    return <Navigate to="/onboarding" replace />;
  }

  async function onSubmit(values: FormValues) {
    setError(null);
    setLoading(true);

    try {
      const result = await supabaseSignUpEmail(values);
      if (result.status === 'email_confirmation_required') {
        setAuthStatus('email_confirmation_required');
        navigate('/auth/verify-email', { replace: true, state: { email: result.email } });
      }
    } catch (err) {
      setError(toAppError(err).userMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-lg p-6">
        <BrandLogo className="mb-6" />
        <h1 className="text-xl font-semibold">Create your Finlo account</h1>
        <p className="mt-1 text-sm text-muted">Your profile and default household are created automatically.</p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <Field label="Full name" error={form.formState.errors.fullName?.message} className="sm:col-span-2">
            <input className="input" autoComplete="name" {...form.register('fullName')} />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message} className="sm:col-span-2">
            <input className="input" type="email" autoComplete="email" {...form.register('email')} />
          </Field>
          <Field label="Country" error={form.formState.errors.country?.message}>
            <select className="select" {...form.register('country')}>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency" error={form.formState.errors.currency?.message}>
            <select className="select" {...form.register('currency')}>
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.label}
                </option>
              ))}
            </select>
          </Field>
          <PasswordInput label="Password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register('password')} />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
          <div className="sm:col-span-2 grid gap-1 text-xs text-muted">
            {getPasswordChecks(password).map((check) => (
              <span key={check.label} className={check.valid ? 'text-success' : undefined}>
                {check.valid ? '✓' : '•'} {check.label}
              </span>
            ))}
          </div>

          {error ? <div className="sm:col-span-2 text-sm text-destructive">{error}</div> : null}

          <Button className="sm:col-span-2" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted">
          Already have an account?{' '}
          <Link className="text-success hover:text-accent" to="/login">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-sm text-muted">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <div className="mt-1 text-xs text-destructive">{error}</div> : null}
    </label>
  );
}
