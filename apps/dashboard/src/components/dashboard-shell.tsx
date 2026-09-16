import { useQuery } from '@tanstack/react-query';
import { Outlet } from 'react-router-dom';

import { currentUserQuery } from '../hooks/queries.js';
import { SidebarProvider, useSidebar } from '../state/sidebar-context.js';
import { AppSidebar } from './app-sidebar.js';
import { CommandPalette } from './command-palette.js';
import { TopHeader } from './top-header.js';

export function DashboardShell() {
  const { data: user } = useQuery(currentUserQuery);

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <DashboardShellContent user={user} />
    </SidebarProvider>
  );
}

function DashboardShellContent({ user }: { user: Parameters<typeof TopHeader>[0]['user'] }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className={cn('min-w-0 transition-all', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <TopHeader user={user} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
        <CommandPalette />
      </div>
    </div>
  );
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

