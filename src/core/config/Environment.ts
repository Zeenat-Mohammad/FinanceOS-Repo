type EnvironmentName = 'development' | 'test' | 'production';

type Environment = {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  VITE_APP_URL: string;
  NODE_ENV: EnvironmentName;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
};

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeNodeEnv(value: string | undefined): EnvironmentName {
  if (value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

const nodeEnv = normalizeNodeEnv(import.meta.env.MODE);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const Environment: Environment = {
  VITE_SUPABASE_URL: requireValue('VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL', supabaseUrl),
  VITE_SUPABASE_ANON_KEY: requireValue('VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey),
  SUPABASE_URL: requireValue('VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL', supabaseUrl),
  SUPABASE_PUBLISHABLE_KEY: requireValue('VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey),
  VITE_APP_URL: import.meta.env.VITE_APP_URL || window.location.origin,
  NODE_ENV: nodeEnv,
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test'
};
