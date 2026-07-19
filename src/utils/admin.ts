import type { User } from '@supabase/supabase-js';
import type { AppError } from '@/shared/errors';

export type AdminRole = 'admin' | 'super_admin';

export type AdminClaims = {
  role: AdminRole | null;
  roles: AdminRole[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

const ADMIN_ROLES = new Set<AdminRole>(['admin', 'super_admin']);

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && ADMIN_ROLES.has(value as AdminRole);
}

function normalizeRoles(value: unknown): AdminRole[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(isAdminRole)));
}

export function getAdminClaimsFromUser(user: User | null | undefined): AdminClaims {
  const metadata = user?.app_metadata as Record<string, unknown> | undefined;
  const role = isAdminRole(metadata?.role) ? metadata.role : null;
  const roles = normalizeRoles(metadata?.roles);
  const allRoles = Array.from(new Set([...(role ? [role] : []), ...roles]));

  return {
    role,
    roles: allRoles,
    isAdmin: allRoles.length > 0,
    isSuperAdmin: allRoles.includes('super_admin')
  };
}

export function isAppAdmin(user: User | null | undefined) {
  return getAdminClaimsFromUser(user).isAdmin;
}

export function getAdminRoleLabel(claims: AdminClaims) {
  if (claims.isSuperAdmin) return 'Super Administrator';
  if (claims.isAdmin) return 'Administrator';
  return 'Standard User';
}

export function getPrimaryAdminRole(claims: AdminClaims) {
  if (claims.isSuperAdmin) return 'super_admin';
  return claims.role ?? claims.roles[0] ?? 'none';
}

export function getAuthProvider(user: User | null | undefined) {
  const metadataProvider = user?.app_metadata?.provider;
  if (typeof metadataProvider === 'string' && metadataProvider.trim()) return metadataProvider;

  const identityProvider = user?.identities?.find((identity) => identity.provider)?.provider;
  return identityProvider ?? 'email';
}

export function isAdminPermissionError(error: unknown) {
  const appError = error as Partial<AppError> | null;
  const cause = appError?.cause as { message?: string; code?: string } | undefined;
  const messages = [
    error instanceof Error ? error.message : '',
    typeof appError?.userMessage === 'string' ? appError.userMessage : '',
    typeof cause?.message === 'string' ? cause.message : ''
  ]
    .join(' ')
    .toLowerCase();

  return appError?.code === 'PERMISSION_ERROR' || cause?.code === '42501' || messages.includes('admin access required');
}
