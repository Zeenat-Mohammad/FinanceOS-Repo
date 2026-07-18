import type { User } from '@supabase/supabase-js';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function isAppAdmin(user: User | null | undefined) {
  if (!user) return false;

  const metadata = user.app_metadata as Record<string, unknown> | undefined;
  const role = typeof metadata?.role === 'string' ? metadata.role : null;
  if (role && ADMIN_ROLES.has(role)) return true;

  const roles = metadata?.roles;
  return Array.isArray(roles) && roles.some((value) => typeof value === 'string' && ADMIN_ROLES.has(value));
}
