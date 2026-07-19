import { useState } from 'react';
import { LogOut, Menu, Plus, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabaseLogout } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { NotificationCenter } from '@/features/notifications/NotificationCenter';
import { SearchModal, useSearchShortcut } from '@/features/search/SearchModal';
import { Button } from '@/shared/components';
import { cn } from '@/core/utils/cn';

export function TopNavbar({
  onOpenMobileNav,
  onToggleSidebar,
  sidebarCollapsed
}: {
  onOpenMobileNav: () => void;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const household = useAuthStore((state) => state.household);
  const setUser = useAuthStore((state) => state.setUser);
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const currency = household?.default_currency ?? profile?.currency ?? 'USD';
  const workspaceName = household?.name?.trim() || 'Finlo workspace';
  const initials = profile?.full_name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useSearchShortcut(() => setSearchOpen(true));

  async function signOut() {
    await supabaseLogout();
    setUser(null);
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
          <button
            aria-label="Open navigation"
            className="rounded-md p-2 text-muted hover:bg-secondary hover:text-foreground lg:hidden"
            onClick={onOpenMobileNav}
            type="button"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-md p-2 text-muted hover:bg-secondary hover:text-foreground lg:inline-flex"
            onClick={onToggleSidebar}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>

          <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{workspaceName}</div>

          <button
            type="button"
            className="hidden h-9 max-w-xs flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 text-left text-sm text-muted hover:bg-secondary md:flex"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search Finlo…</span>
            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>

          <button
            type="button"
            aria-label="Open search"
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-white text-foreground hover:bg-secondary md:hidden"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </button>

          <Button
            className="hidden h-9 bg-[var(--color-button)] px-3 text-white hover:bg-[var(--color-button-hover)] sm:inline-flex"
            disabled={!profile?.onboarding_completed}
            onClick={() => navigate('/transactions')}
            title="Quick add transaction"
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </Button>

          <button
            type="button"
            aria-label="Quick add transaction"
            className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-foreground hover:bg-secondary sm:hidden"
            disabled={!profile?.onboarding_completed}
            onClick={() => navigate('/transactions')}
          >
            <Plus className="h-4 w-4" />
          </button>

          <NotificationCenter />

          <span
            className="hidden rounded-md border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--color-card-foreground)] lg:inline-flex"
            title="Display currency (read only)"
          >
            {currency}
          </span>

          <Button
            className="hidden h-9 border border-border bg-white px-3 text-[var(--color-card-foreground)] hover:bg-secondary sm:inline-flex"
            disabled={!profile?.onboarding_completed}
            onClick={() => navigate('/profile')}
          >
            <User className="h-4 w-4" />
            Profile
          </Button>

          <div className="relative">
            <button
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-label="Open profile menu"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-[var(--color-sidebar)] text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!profile?.onboarding_completed}
              onClick={() => setProfileMenuOpen((open) => !open)}
              type="button"
            >
              {initials || <User className="h-4 w-4" />}
            </button>
            {profileMenuOpen ? (
              <div className="card-shell absolute right-0 mt-2 w-48 p-2" role="menu">
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    navigate('/profile');
                  }}
                  role="menuitem"
                  type="button"
                >
                  <User className="h-4 w-4 text-accent" />
                  Profile
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void signOut();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <LogOut className="h-4 w-4 text-accent" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>

          <Button
            className={cn('h-9 border border-border bg-white px-3 text-[var(--color-card-foreground)] hover:bg-secondary')}
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
