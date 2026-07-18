import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/data/supabase/client';
import { Environment } from '@/core/config/Environment';
import { AuthError, SessionExpiredError } from '@/shared/errors';
import { Logger } from '@/core/logging/Logger';
import { SecurityRepository } from '@/data/repositories/ProfileRepository';

const rememberMeKey = 'finlo:remember-me';
const loginAttemptsKey = 'finlo:login-attempts';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;

function assertLoginNotLocked(email: string) {
  try {
    const raw = window.localStorage.getItem(loginAttemptsKey);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, { count: number; lockedUntil?: number }>;
    const entry = map[email.toLowerCase()];
    if (entry?.lockedUntil && Date.now() < entry.lockedUntil) {
      const seconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
      throw new AuthError(
        'Login temporarily locked',
        { email, seconds },
        `Too many failed sign-in attempts. Try again in ${seconds}s.`
      );
    }
  } catch (error) {
    if (error instanceof AuthError) throw error;
  }
}

function recordLoginFailure(email: string) {
  try {
    const key = email.toLowerCase();
    const raw = window.localStorage.getItem(loginAttemptsKey);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, { count: number; lockedUntil?: number }>;
    const prev = map[key] ?? { count: 0 };
    const count = prev.count + 1;
    map[key] =
      count >= MAX_LOGIN_ATTEMPTS
        ? { count, lockedUntil: Date.now() + LOCKOUT_MS }
        : { count };
    window.localStorage.setItem(loginAttemptsKey, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function clearLoginFailures(email: string) {
  try {
    const raw = window.localStorage.getItem(loginAttemptsKey);
    if (!raw) return;
    const map = JSON.parse(raw) as Record<string, unknown>;
    delete map[email.toLowerCase()];
    window.localStorage.setItem(loginAttemptsKey, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export type SignUpResult =
  | {
      status: 'authenticated';
      session: Session;
      user: User;
    }
  | {
      status: 'email_confirmation_required';
      session: null;
      user: User;
      email: string;
    };

function describeSession(session: Session | null | undefined) {
  return session
    ? {
        userId: session.user.id,
        expiresAt: session.expires_at,
        hasAccessToken: Boolean(session.access_token),
        hasRefreshToken: Boolean(session.refresh_token)
      }
    : null;
}

function authUserMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login') || normalized.includes('invalid credentials')) {
    return 'Email or password is incorrect.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Your email address is not confirmed yet. Please confirm your email, then sign in.';
  }

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return 'An account with this email already exists. Please sign in or reset your password.';
  }

  if (normalized.includes('rate limit') || normalized.includes('too many') || normalized.includes('email rate limit')) {
    return 'Too many email requests. Please wait a moment before trying again.';
  }

  if (normalized.includes('expired') || normalized.includes('jwt')) {
    return 'Your session expired. Please sign in again.';
  }

  return message || 'Authentication failed. Please try again.';
}

export async function supabaseLoginEmail(
  email: string,
  password: string,
  rememberMe: boolean,
  options?: { skipSecurityLog?: boolean }
): Promise<Session> {
  assertLoginNotLocked(email);
  Logger.info('Auth signIn started', { email });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  Logger.info('Auth signIn completed', { userId: data.user?.id, session: describeSession(data.session), error });

  if (error) {
    recordLoginFailure(email);
    if (!options?.skipSecurityLog) {
      await SecurityRepository.logEvent(null, 'login_failure', { emailDomain: email.split('@')[1] ?? null }).catch(() => undefined);
    }
    throw new AuthError(error.message, error, authUserMessage(error.message));
  }

  if (!data.session) {
    recordLoginFailure(email);
    throw new SessionExpiredError('Supabase did not return a session after login', { userId: data.user?.id });
  }

  clearLoginFailures(email);
  window.localStorage.setItem(rememberMeKey, rememberMe ? 'true' : 'false');
  if (!options?.skipSecurityLog) {
    await SecurityRepository.logEvent(data.user.id, 'login_success').catch(() => undefined);
  }

  return data.session;
}

export async function supabaseSignUpEmail(input: {
  email: string;
  password: string;
  fullName: string;
  country?: string | null;
  currency?: string;
  locale?: string;
  timezone?: string;
}): Promise<SignUpResult> {
  const { email, password } = input;
  Logger.info('Auth signUp started', { email });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${Environment.VITE_APP_URL}/auth/email-verified`,
      data: {
        full_name: input.fullName,
        country: input.country,
        currency: input.currency,
        locale: input.locale,
        timezone: input.timezone
      }
    }
  });
  Logger.info('Auth signUp completed', { userId: data.user?.id, session: describeSession(data.session), error });

  if (error) {
    throw new AuthError(error.message, error, authUserMessage(error.message));
  }

  if (!data.user) {
    throw new AuthError('No user returned from Supabase signup', data, 'Signup could not be completed. Please try again.');
  }

  if (!data.session) {
    Logger.info('Auth signUp requires email confirmation', { userId: data.user.id, email });
    return {
      status: 'email_confirmation_required',
      session: null,
      user: data.user,
      email
    };
  }

  return {
    status: 'authenticated',
    session: data.session,
    user: data.user
  };
}

export async function resendVerificationEmail(email: string): Promise<void> {
  Logger.info('Auth resend verification started', { email });
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${Environment.VITE_APP_URL}/auth/email-verified`
    }
  });
  Logger.info('Auth resend verification completed', { email, error });

  if (error) {
    throw new AuthError(error.message, error, authUserMessage(error.message));
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  Logger.debug('Auth getUser completed', { userId: data.user?.id, error });

  if (error) {
    Logger.warn('Auth getUser failed', { error });
    return null;
  }

  return data.user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  Logger.debug('Auth getSession completed', { session: describeSession(data.session), error });

  if (error) {
    Logger.warn('Auth getSession failed', { error });
    return null;
  }

  return data.session;
}

export async function refreshSession(): Promise<Session | null> {
  Logger.info('Auth refreshSession started');
  const { data, error } = await supabase.auth.refreshSession();
  Logger.info('Auth refreshSession completed', { session: describeSession(data.session), error });

  if (error) {
    throw new SessionExpiredError(error.message, error);
  }

  return data.session;
}

export function onAuthStateChanged(callback: (session: Session | null, event: string) => void) {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((_event, session) => {
    Logger.info('Auth state changed', { event: _event, session: describeSession(session) });
    callback(session, _event);
  });

  return () => subscription.unsubscribe();
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${Environment.VITE_APP_URL}/reset-password`
  });

  if (error) {
    throw new AuthError(error.message, error, authUserMessage(error.message));
  }
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw new AuthError(error.message, error, authUserMessage(error.message));
  }
}

export async function changePasswordWithCurrentPassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  await supabaseLoginEmail(email, currentPassword, true, { skipSecurityLog: true });
  await updatePassword(newPassword);
}

export async function verifyPassword(email: string, password: string): Promise<void> {
  await supabaseLoginEmail(email, password, true, { skipSecurityLog: true });
}

export async function supabaseLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AuthError(error.message, error, authUserMessage(error.message));
  }

  window.localStorage.removeItem(rememberMeKey);
}
