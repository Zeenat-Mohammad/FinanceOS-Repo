import type { User } from '@supabase/supabase-js';
import { CalendarDays, IdCard, Mail, Shield, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/shared/components';
import { getAdminRoleLabel, getAuthProvider, getPrimaryAdminRole, type AdminClaims } from '@/utils/admin';
import type { Profile } from '@/types/finance';

export function AdminProfileCard({ user, claims, profile }: { user: User; claims: AdminClaims; profile?: Profile | null }) {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const fullName = profile?.full_name ?? readString(metadata?.full_name) ?? readString(metadata?.name) ?? 'Administrator';
  const avatarUrl = profile?.avatar_url ?? readString(metadata?.avatar_url) ?? readString(metadata?.picture);
  const roleLabel = getAdminRoleLabel(claims);

  return (
    <Card className="overflow-hidden p-0">
      <div className="relative border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(58,157,157,0.18),transparent_38%),linear-gradient(135deg,var(--color-primary),var(--color-secondary))] p-6 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border border-white/15 bg-white/10 text-2xl font-semibold shadow-soft">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-success">
              <Shield aria-hidden className="h-3.5 w-3.5" />
              {roleLabel}
            </div>
            <h1 className="mt-3 truncate text-2xl font-semibold tracking-tight">{fullName}</h1>
            <p className="mt-1 truncate text-sm text-white/70">{user.email ?? 'No email available'}</p>
          </div>
        </div>
      </div>

      <dl className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        <ProfileItem icon={UserRound} label="Full name" value={fullName} />
        <ProfileItem icon={Mail} label="Email" value={user.email ?? 'Unavailable'} />
        <ProfileItem icon={IdCard} label="User ID" value={user.id} mono />
        <ProfileItem icon={Shield} label="Role" value={getPrimaryAdminRole(claims)} />
        <ProfileItem icon={Shield} label="Roles array" value={claims.roles.length ? claims.roles.join(', ') : 'None'} />
        <ProfileItem icon={CalendarDays} label="Account created" value={formatDate(user.created_at)} />
        <ProfileItem icon={CalendarDays} label="Last sign-in" value={formatDate(user.last_sign_in_at)} />
        <ProfileItem icon={Shield} label="Authentication provider" value={getAuthProvider(user)} />
        <ProfileItem icon={UserRound} label="Avatar" value={avatarUrl ? 'Available' : 'Not set'} />
      </dl>
    </Card>
  );
}

function ProfileItem({
  icon: Icon,
  label,
  value,
  mono
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-brand border border-border/60 bg-surface-muted p-3">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Icon aria-hidden className="h-3.5 w-3.5 text-accent" />
        {label}
      </dt>
      <dd className={`mt-2 break-words text-sm font-medium text-foreground ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | undefined | null) {
  if (!value) return 'Unavailable';
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return value;
  }
}
