import { Outlet } from 'react-router-dom';
import { BrandLogo, ContentContainer, Drawer } from '@/shared/components';
import { useUIStore } from '@/shared/state/ui';
import { cn } from '@/core/utils/cn';
import { FloatingChatbot } from '@/features/assistant/FloatingChatbot';
import { SidebarNavigation, MobileNavBar, DrawerHeader } from './SidebarNavigation';
import { TopNavbar } from './TopNavbar';

export default function ShellLayout() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebarCollapsed = useUIStore((state) => state.toggleSidebarCollapsed);

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
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNavigation collapsed={sidebarCollapsed} />
        </div>
        <div
          className={cn(
            'mt-3 rounded-brand border border-white/10 bg-white/5 p-3 text-xs text-white/70',
            sidebarCollapsed && 'grid place-items-center p-2'
          )}
          title="Support: hajra.mshahid24@gmail.com"
        >
          {sidebarCollapsed ? (
            <span aria-label="Support" className="font-semibold text-success">?</span>
          ) : (
            <>
              <div className="font-medium text-white">Support</div>
              <div className="mt-1 break-all">hajra.mshahid24@gmail.com</div>
            </>
          )}
        </div>
      </aside>

      <Drawer open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        <div className="mb-6 flex items-center justify-between">
          <BrandLogo />
          <DrawerHeader onClose={() => setSidebarOpen(false)} />
        </div>
        <SidebarNavigation onNavigate={() => setSidebarOpen(false)} />
        <div className="mt-6 rounded-brand border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <div className="font-medium text-white">Support</div>
          <div className="mt-1 break-all">hajra.mshahid24@gmail.com</div>
        </div>
      </Drawer>

      <div className={cn('transition-[padding] duration-200', sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <TopNavbar
          onOpenMobileNav={() => setSidebarOpen(true)}
          onToggleSidebar={toggleSidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="pb-24 pt-5 lg:pb-8">
          <ContentContainer>
            <Outlet />
          </ContentContainer>
        </main>

        <MobileNavBar />
      </div>

      <FloatingChatbot />
    </div>
  );
}
