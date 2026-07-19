import { useState } from 'react';
import { ChevronDown, ChevronRight, Lock, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import { isAppAdmin } from '@/features/admin/adminAccess';
import { allowedDuringOnboarding, navGroups, type NavGroup } from '@/app/navigation/navGroups';
import { cn } from '@/core/utils/cn';

function GroupSection({
  group,
  collapsed,
  onNavigate
}: {
  group: NavGroup;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const onboardingCompleted = useAuthStore((state) => state.profile?.onboarding_completed ?? false);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {group.items.map((item) => (
          <NavLinkItem key={`${group.id}-${item.label}`} item={item} collapsed onboardingCompleted={onboardingCompleted} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/55 hover:text-white/80"
        onClick={() => setOpen((value) => !value)}
      >
        {group.label}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open ? (
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavLinkItem
              key={`${group.id}-${item.label}`}
              item={item}
              onboardingCompleted={onboardingCompleted}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavLinkItem({
  item,
  collapsed,
  onboardingCompleted,
  onNavigate
}: {
  item: NavGroup['items'][number];
  collapsed?: boolean;
  onboardingCompleted: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const path = item.path.split('?')[0];
  const locked = !path.startsWith('/admin') && !onboardingCompleted && !allowedDuringOnboarding.has(path);
  const active = item.end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  if (locked) {
    return (
      <button
        aria-label={`${item.label} locked. Complete onboarding to unlock.`}
        className={cn(
          'flex w-full cursor-not-allowed items-center rounded-md px-3 py-2 text-left text-sm text-white/50',
          collapsed ? 'justify-center' : 'gap-3'
        )}
        disabled
        type="button"
      >
        <item.icon aria-hidden className="h-4 w-4 shrink-0 text-success/70" />
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
        {!collapsed ? <Lock aria-hidden className="ml-auto h-3.5 w-3.5 shrink-0" /> : null}
      </button>
    );
  }

  return (
    <NavLink
      to={path}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center rounded-md px-3 py-2 text-sm text-white/90 transition hover:bg-secondary hover:text-white',
        collapsed ? 'justify-center' : 'gap-3',
        active && 'bg-accent text-white shadow-sm'
      )}
    >
      <item.icon aria-hidden className="h-4 w-4 shrink-0 text-success" />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );
}

export function SidebarNavigation({
  collapsed,
  onNavigate
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAppAdmin(user);
  const groups = navGroups.filter((group) => !group.adminOnly || isAdmin);

  return (
    <nav className="space-y-4">
      {groups.map((group) => (
        <GroupSection key={group.id} group={group} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function MobileNavBar() {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const location = useLocation();
  const isAdmin = isAppAdmin(user);
  const onboardingCompleted = profile?.onboarding_completed ?? false;
  const items = navGroups
    .filter((group) => !group.adminOnly || isAdmin)
    .flatMap((group) => group.items)
    .slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-[var(--color-sidebar)] px-2 py-2 lg:hidden">
      {items.map((item) => {
        const path = item.path.split('?')[0];
        const locked = !path.startsWith('/admin') && !onboardingCompleted && !allowedDuringOnboarding.has(path);
        if (locked) {
          return (
            <button
              aria-label={`${item.label} locked`}
              className="flex cursor-not-allowed flex-col items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/50 opacity-70"
              disabled
              key={`${item.label}-${item.path}`}
              type="button"
            >
              <Lock aria-hidden className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        }
        return (
          <NavLink
            key={`${item.label}-${item.path}`}
            to={path}
            end={item.end}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/70',
              (item.end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`)) &&
                'bg-accent text-white'
            )}
          >
            <item.icon aria-hidden className="h-4 w-4" />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <button
      aria-label="Close navigation"
      className="rounded-md p-1 text-white/70 hover:bg-secondary hover:text-white"
      onClick={onClose}
      type="button"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
