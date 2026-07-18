import { useEffect, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getCurrentSession, getCurrentUser, onAuthStateChanged, refreshSession } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { BrandLogo, Button, ErrorState, LoadingState } from '@/shared/components';
import { Logger } from '@/core/logging/Logger';
import { ensureUserInitialized } from '@/features/auth/authInitialization';
import { toAppError } from '@/shared/errors';

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    authStatus,
    initialized,
    initializationStatus,
    initializationError,
    setAuthStatus,
    setInitialized,
    setUser,
    setAuthContext,
    setInitializationStatus
  } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    let initializationRun = 0;

    async function initializeFromSession(session: Session | null | undefined, source: string) {
      const runId = ++initializationRun;
      Logger.info('AuthProvider initialization requested', {
        source,
        hasSession: Boolean(session),
        userId: session?.user.id,
        expiresAt: session?.expires_at
      });

      if (cancelled || runId !== initializationRun) return;

      const user = session?.user ?? null;
      if (!user) {
        setUser(null);
        setInitializationStatus('idle');
        setInitialized(true);
        Logger.info('AuthProvider resolved unauthenticated', { source });
        return;
      }

      setAuthStatus('loading');
      setInitializationStatus('checking');

      try {
        const verifiedUser = await getCurrentUser();
        if (!verifiedUser) {
          Logger.warn('AuthProvider getUser returned no verified user despite session', { source, sessionUserId: user.id });
        }

        const { profile, household } = await ensureUserInitialized(user);
        if (!cancelled && runId === initializationRun) {
          setAuthContext({ user, profile, household });
          setInitializationStatus('ready');
          setInitialized(true);
          Logger.info('AuthProvider resolved authenticated', { source, userId: user.id, householdId: household.id });
        }
      } catch (error) {
        const appError = toAppError(error);
        if (!cancelled && runId === initializationRun) {
          setUser(user);
          setInitializationStatus('failed', appError);
          setInitialized(true);
          Logger.error('AuthProvider authenticated session failed workspace initialization', { source, userId: user.id, appError, error });
        }
      }
    }

    getCurrentSession()
      .then(async (session) => {
        if (session?.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
          const refreshed = await refreshSession();
          await initializeFromSession(refreshed, 'bootstrap:refresh');
          return;
        }

        await initializeFromSession(session, 'bootstrap:getSession');
      })
      .catch((error) => {
        Logger.warn('Session bootstrap failed', { error });
        setUser(null);
        setInitialized(true);
      })

    const unsubscribe = onAuthStateChanged((session, event) => {
      window.setTimeout(() => {
        initializeFromSession(session, `onAuthStateChange:${event}`).catch((error) => Logger.error('Auth state initialization failed', { error }));
      }, 0);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [setAuthContext, setAuthStatus, setInitializationStatus, setInitialized, setUser]);

  if (!initialized || authStatus === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted">
        <div className="space-y-6 text-center">
          <BrandLogo className="justify-center" />
          <LoadingState label="Loading Finlo" />
        </div>
      </div>
    );
  }

  if (initializationStatus === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted">
        <div className="space-y-6 text-center">
          <BrandLogo className="justify-center" />
          <LoadingState label="Preparing your Finlo workspace" />
        </div>
      </div>
    );
  }

  if (initializationStatus === 'failed' && initializationError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <ErrorState
          title="Workspace initialization failed"
          message={initializationError.userMessage}
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        />
      </div>
    );
  }

  return <>{children}</>;
}
