import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { sendPasswordReset } from './authService';
import { BrandLogo, Button, Card } from '@/shared/components';
import { toAppError } from '@/shared/errors';

const schema = z.object({
  email: z.string().email()
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setMessage(null);
    setError(null);

    try {
      await sendPasswordReset(values.email);
      setMessage('Password reset email sent.');
    } catch (err) {
      setError(toAppError(err).userMessage);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md p-6">
        <BrandLogo className="mb-6" />
        <h1 className="text-xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-muted">Enter your email and we will send a reset link.</p>
        <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <label className="block">
            <span className="text-sm text-muted">Email</span>
            <input className="input mt-1" type="email" {...form.register('email')} />
            {form.formState.errors.email ? <div className="mt-1 text-xs text-destructive">{form.formState.errors.email.message}</div> : null}
          </label>
          {message ? <div className="text-sm text-success">{message}</div> : null}
          {error ? <div className="text-sm text-destructive">{error}</div> : null}
          <Button className="w-full" type="submit">
            Send reset link
          </Button>
        </form>
        <Link className="mt-5 inline-block text-sm text-success hover:text-accent" to="/login">
          Back to login
        </Link>
      </Card>
    </div>
  );
}
