import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function supabaseLoginEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned');
  return data.user;
}

export async function supabaseSignUpEmail(email: string, password: string): Promise<User | null> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function supabaseLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

