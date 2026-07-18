import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Household, Profile } from '@/types/finance';
import type { AppError } from '@/shared/errors';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  household: Household | null;
  authStatus: 'loading' | 'authenticated' | 'unauthenticated' | 'email_confirmation_required';
  loading: boolean;
  error: string | null;
  initialized: boolean;
  initializationStatus: 'idle' | 'checking' | 'ready' | 'failed';
  initializationError: AppError | null;
  setUser: (user: User | null) => void;
  setAuthContext: (context: { user: User | null; profile: Profile | null; household: Household | null }) => void;
  setAuthStatus: (status: AuthState['authStatus']) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
  setInitialized: (value: boolean) => void;
  setInitializationStatus: (status: AuthState['initializationStatus'], error?: AppError | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  household: null,
  authStatus: 'loading',
  loading: false,
  error: null,
  initialized: false,
  initializationStatus: 'idle',
  initializationError: null,
  setUser: (user) =>
    set(
      user
        ? { user, authStatus: 'authenticated' }
        : { user: null, profile: null, household: null, authStatus: 'unauthenticated', initializationStatus: 'idle', initializationError: null }
    ),
  setAuthContext: ({ user, profile, household }) => set({ user, profile, household, authStatus: user ? 'authenticated' : 'unauthenticated' }),
  setAuthStatus: (authStatus) => set({ authStatus }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setInitialized: (initialized) => set({ initialized }),
  setInitializationStatus: (initializationStatus, initializationError = null) => set({ initializationStatus, initializationError })
}));
