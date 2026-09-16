import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { TooltipProvider } from '@vortex/ui';

import { SelectedGuildProvider } from '../state/selected-guild-context.js';
import { SidebarProvider } from '../state/sidebar-context.js';
import { AppSidebar } from './app-sidebar.js';
import { TopHeader } from './top-header.js';

const mockUser = {
  id: '09c225e0-f745-42db-81e0-6c7adf874ad4',
  discordId: '123456789012345678',
  username: 'testuser',
  globalName: 'Test User',
  avatar: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderSidebar({ collapsed, route = '/dashboard' }: { collapsed: boolean; route?: string }) {
  window.localStorage.setItem('vortex.sidebar.collapsed', String(collapsed));
  const client = createClient();
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('AppSidebar', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('expanded sidebar shows labels and section titles', () => {
    renderSidebar({ collapsed: false });

    expect(screen.getByText('Vortex')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveTextContent('Dashboard');
    expect(screen.getByRole('link', { name: /Servers/i })).toHaveTextContent('Servers');
  });

  it('collapsed sidebar hides labels and section titles', () => {
    renderSidebar({ collapsed: true });

    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('collapsed nav icons are centered', () => {
    renderSidebar({ collapsed: true });

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveClass('justify-center');
  });

  it('collapsed sidebar shows tooltips on hover', async () => {
    renderSidebar({ collapsed: true });

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    await userEvent.hover(dashboardLink);

    expect(await screen.findByRole('tooltip', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('active item is visible in collapsed state', () => {
    renderSidebar({ collapsed: true, route: '/dashboard' });

    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
    expect(dashboardLink).toHaveClass('bg-sidebar-accent');
    expect(dashboardLink).toHaveClass('text-sidebar-foreground');
  });

  it('active item is visible in expanded state', () => {
    renderSidebar({ collapsed: false, route: '/dashboard' });

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveClass('bg-sidebar-accent');
    expect(dashboardLink).toHaveClass('text-sidebar-foreground');
  });

  it('mobile uses the top-header sheet drawer instead of the collapsed sidebar', () => {
    const client = createClient();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <QueryClientProvider client={client}>
          <SelectedGuildProvider>
            <TooltipProvider>
              <TopHeader user={mockUser} />
            </TooltipProvider>
          </SelectedGuildProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Open menu/i })).toBeInTheDocument();
  });
});
