import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
  setError: (msg: string | null) => void;
  setInitialized: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setInitialized: (initialized) => set({ initialized })
}));

