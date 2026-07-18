import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Environment } from '@/core/config/Environment';

export const createClient = () =>
  createSupabaseClient(Environment.SUPABASE_URL, Environment.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      persistSession: true,
      storage: window.localStorage,
      storageKey: 'finlo-auth-session'
    }
  });
