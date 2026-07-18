import { useEffect, useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { resendVerificationEmail } from './authService';
import { BrandLogo, Button, Card } from '@/shared/components';
import { toAppError } from '@/shared/errors';

const cooldownSeconds = 60;

export default function VerifyEmailPage() {
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [cooldown, setCooldown] = useState(cooldownSeconds);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (!email || cooldown > 0 || resending) return;

    setMessage(null);
    setError(null);
    setResending(true);

    try {
      await resendVerificationEmail(email);
      setMessage('Verification email sent. Please check your inbox.');
      setCooldown(cooldownSeconds);
    } catch (err) {
      setError(toAppError(err).userMessage);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <Card className="w-full max-w-md p-6 text-center">
        <BrandLogo className="mb-6 justify-center" />
        <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
        <h1 className="mt-4 text-xl font-semibold">Account Created Successfully</h1>
        <p className="mt-2 text-sm text-muted">
          Check your email{email ? ` at ${email}` : ''} to verify your account. Once verified, you can sign in.
        </p>

        <div className="mt-6 grid gap-3">
          {!initialEmail ? (
            <label className="text-left">
              <span className="text-sm text-muted">Email</span>
              <input className="input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
          ) : null}
          <Button type="button" onClick={() => window.open('mailto:', '_blank')}>
            <Mail className="h-4 w-4" />
            Open Email App
          </Button>
          <Button
            className="border border-border bg-transparent text-foreground hover:bg-secondary"
            disabled={!email || cooldown > 0 || resending}
            onClick={resend}
            type="button"
          >
            {resending ? 'Sending...' : cooldown > 0 ? `Resend Verification Email (${cooldown}s)` : 'Resend Verification Email'}
          </Button>
          <Link className="text-sm text-success hover:text-accent" to="/login">
            Back to Sign In
          </Link>
        </div>

        {message ? <div className="mt-4 text-sm text-success">{message}</div> : null}
        {error ? <div className="mt-4 text-sm text-destructive">{error}</div> : null}
      </Card>
    </div>
  );
}
