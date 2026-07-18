import { supabase } from '@/data/supabase/client';

/** Invoke the insights-proxy edge function; never put provider keys in Vite. */
export async function invokeInsightsProxy<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('insights-proxy', {
      body: { action, ...payload }
    });
    if (error) return null;
    return data as T;
  } catch {
    return null;
  }
}
