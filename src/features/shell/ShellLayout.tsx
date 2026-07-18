import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  X
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabaseLogout } from '@/features/auth/authService';
import { useAuthStore } from '@/features/auth/authStore';
import { adminRoutes, protectedRoutes } from '@/app/routes/routeGroups';
import { isAppAdmin } from '@/features/admin/adminAccess';
import { BrandLogo, Button, ContentContainer, Drawer } from '@/shared/components';
import { useUIStore } from '@/shared/state/ui';
import { resolveTheme, useThemeStore } from '@/shared/state/theme';
import { cn } from '@/core/utils/cn';
import { FloatingChatbot } from '@/features/assistant/FloatingChatbot';

const appNavRoutes = protectedRoutes.filter((route) => route.nav);
const adminNavRoutes = adminRoutes.filter((route) => route.nav);
const allowedDuringOnboarding = new Set(['/onboarding']);

function getNavigationRoutes(isAdmin: boolean) {
  return isAdmin ? [...adminNavRoutes, ...appNavRoutes] : appNavRoutes;
}

function NavigationLinks({
  onNavigate,
  collapsed
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const onboardingCompleted = useAuthStore((state) => state.profile?.onboarding_completed ?? false);
  const user = useAuthStore((state) => state.user);
  const routes = getNavigationRoutes(isAppAdmin(user));

  return (
    <nav className="space-y-1">
      {routes.map((route) => {
        const Icon = route.icon;
        const locked = route.path !== '/admin' && !onboardingCompleted && !allowedDuringOnboarding.has(route.path);

        if (locked) {
          return (
            <button
              aria-label={`${route.label} locked. Complete onboarding to unlock this feature.`}
              className={cn(
                'flex w-full cursor-not-allowed items-center rounded-md px-3 py-2 text-left text-sm text-white/50',
                collapsed ? 'justify-center' : 'gap-3'
              )}
              disabled
              key={route.path}
              title="Complete onboarding to unlock this feature."
              type="button"
            >
              {Icon ? <Icon aria-hidden className="h-4 w-4 shrink-0 text-success/70" /> : null}
              {!collapsed ? <span className="truncate">{route.label}</span> : null}
              {!collapsed ? <Lock aria-hidden className="ml-auto h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          );
        }

        return (
          <NavLink
            key={route.path}
            to={route.path}
            end={route.end}
            onClick={onNavigate}
            title={collapsed ? route.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md px-3 py-2 text-sm text-white/90 transition hover:bg-secondary hover:text-white',
                collapsed ? 'justify-center' : 'gap-3',
                isActive && 'bg-accent text-white shadow-sm'
              )
            }
          >
            {Icon ? <Icon aria-hidden className="h-4 w-4 shrink-0 text-success" /> : null}
            {!collapsed ? <span className="truncate">{route.label}</span> : null}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function ShellLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const setUser = useAuthStore((state) => state.setUser);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);
  const theme = useThemeStore((state) => state.theme);
  const cycleTheme = useThemeStore((state) => state.cycleTheme);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isAdmin = isAppAdmin(user);
  const mobileNavRoutes = getNavigationRoutes(isAdmin).slice(0, 5);
  const resolved = resolveTheme(theme);
  const initials = profile?.full_name
    ?.split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function signOut() {
    await supabaseLogout();
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-[var(--color-sidebar)] p-3 text-[var(--color-sidebar-foreground)] transition-[width] duration-200 lg:flex lg:flex-col',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <div className={cn('mb-4 flex items-center', sidebarCollapsed ? 'justify-center' : 'justify-between gap-2')}>
          <BrandLogo compact={sidebarCollapsed} className={sidebarCollapsed ? '' : 'min-w-0'} />
          {!sidebarCollapsed ? (
            <button
              type="button"
              aria-label="Collapse sidebar"
              className="rounded-md p-1.5 text-white/70 transition hover:bg-secondary hover:text-white"
              onClick={toggleSidebarCollapsed}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {sidebarCollapsed ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            className="mb-3 grid place-items-center rounded-md p-2 text-white/70 transition hover:bg-secondary hover:text-white"
            onClick={toggleSidebarCollapsed}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavigationLinks collapsed={sidebarCollapsed} />
        </div>

        <div
          className={cn(
            'mt-3 rounded-brand border border-white/10 bg-white/5 p-3 text-xs text-white/70',
            sidebarCollapsed && 'grid place-items-center p-2'
          )}
          title="Support: hajra.mshahid242gmail.com"
        >
          {sidebarCollapsed ? (
            <span aria-label="Support" className="font-semibold text-success">?</span>
          ) : (
            <>
              <div className="font-medium text-white">Support</div>
              <div className="mt-1 break-all">hajra.mshahid242gmail.com</div>
            </>
          )}
        </div>
      </aside>

      <Drawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo />
          <button
            aria-label="Close navigation"
            className="rounded-md p-1 text-white/70 hover:bg-secondary hover:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <NavigationLinks onNavigate={() => setSidebarOpen(false)} />
        <div className="mt-6 rounded-brand border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <div className="font-medium text-white">Support</div>
          <div className="mt-1 break-all">hajra.mshahid242gmail.com</div>
        </div>
      </Drawer>

      <div className={cn('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
          <ContentContainer className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                aria-label="Open navigation"
                className="rounded-md p-2 text-muted hover:bg-secondary hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden rounded-md p-2 text-muted hover:bg-secondary hover:text-foreground lg:inline-flex"
                onClick={toggleSidebarCollapsed}
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <div className="hidden text-sm text-muted lg:block">Finlo workspace</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Theme: ${theme}. Click to change.`}
                title={`Theme: ${theme}`}
                className="grid h-9 w-9 place-items-center rounded-md border border-border bg-surface text-foreground transition hover:bg-secondary"
                onClick={cycleTheme}
              >
                {resolved === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <Button
                className="hidden border border-border bg-surface text-foreground hover:bg-secondary sm:inline-flex"
                disabled={!profile?.onboarding_completed}
                onClick={() => {
                  setProfileMenuOpen(false);
                  navigate('/profile');
                }}
                title={profile?.onboarding_completed ? 'Profile' : 'Complete onboarding to unlock this feature.'}
              >
                <User aria-hidden className="h-4 w-4" />
                Profile
              </Button>

              <div className="relative">
                <button
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile menu"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-[var(--color-sidebar)] text-xs font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!profile?.onboarding_completed}
                  onClick={() => setProfileMenuOpen((open) => !open)}
                  title={profile?.onboarding_completed ? 'Profile menu' : 'Complete onboarding to unlock this feature.'}
                  type="button"
                >
                  {initials || <User aria-hidden className="h-4 w-4" />}
                </button>
                {profileMenuOpen ? (
                  <div className="card-shell absolute right-0 mt-2 w-48 p-2" role="menu">
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        navigate('/profile');
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <User aria-hidden className="h-4 w-4 text-accent" />
                      Profile
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        void signOut();
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <LogOut aria-hidden className="h-4 w-4 text-accent" />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>

              <Button className="border border-border bg-surface text-foreground hover:bg-secondary" onClick={signOut}>
                <LogOut aria-hidden className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </ContentContainer>
        </header>

        <main className="pb-24 pt-5 lg:pb-8">
          <ContentContainer>
            <Outlet />
          </ContentContainer>
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-[var(--color-sidebar)] px-2 py-2 lg:hidden">
          {mobileNavRoutes.map((route) => {
            const Icon = route.icon;
            const locked = route.path !== '/admin' && !profile?.onboarding_completed && !allowedDuringOnboarding.has(route.path);

            if (locked) {
              return (
                <button
                  aria-label={`${route.label} locked. Complete onboarding to unlock this feature.`}
                  className="flex cursor-not-allowed flex-col items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/50 opacity-70"
                  disabled
                  key={route.path}
                  title="Complete onboarding to unlock this feature."
                  type="button"
                >
                  <Lock aria-hidden className="h-4 w-4" />
                  <span className="max-w-full truncate">{route.label}</span>
                </button>
              );
            }

            return (
              <NavLink
                key={route.path}
                to={route.path}
                end={route.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-md px-2 py-1 text-[11px] text-white/70',
                    isActive && 'bg-accent text-white'
                  )
                }
              >
                {Icon ? <Icon aria-hidden className="h-4 w-4" /> : null}
                <span className="max-w-full truncate">{route.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <FloatingChatbot />
    </div>
  );
}
