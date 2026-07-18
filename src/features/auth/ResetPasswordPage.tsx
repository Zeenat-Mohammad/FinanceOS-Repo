import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { updatePassword } from './authService';
import { BrandLogo, Button, Card } from '@/shared/components';
import { toAppError } from '@/shared/errors';
import { PasswordInput } from './PasswordInput';
import { getPasswordChecks, passwordSchema } from './passwordValidation';

const schema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.')
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const password = form.watch('password') ?? '';

  async function onSubmit(values: FormValues) {
    setMessage(null);
    setError(null);

    try {
      await updatePassword(values.password);
      setMessage('Password updated. You can sign in with the new password.');
    } catch (err) {
      setError(toAppError(err).userMessage);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md p-6">
        <BrandLogo className="mb-6" />
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <PasswordInput label="Password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register('password')} />
          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            error={form.formState.errors.confirmPassword?.message}
            {...form.register('confirmPassword')}
          />
          <div className="grid gap-1 text-xs text-muted">
            {getPasswordChecks(password).map((check) => (
              <span key={check.label} className={check.valid ? 'text-success' : undefined}>
                {check.valid ? '✓' : '•'} {check.label}
              </span>
            ))}
          </div>
          {message ? <div className="text-sm text-success">{message}</div> : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          <Button className="w-full" type="submit">
            Update password
          </Button>
        </form>
        <Link className="mt-5 inline-block text-sm text-success hover:text-accent" to="/login">
          Back to login
        </Link>
      </Card>
    </div>
  );
}
