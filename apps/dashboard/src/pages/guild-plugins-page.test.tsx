import type { GuildPlugin } from '@vortex/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../lib/api-client.js';
import { SelectedGuildProvider } from '../state/selected-guild-context.js';
import { GuildPluginsPage } from './guild-plugins-page.js';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockGuildId = '1111111111111111111';

const welcomePlugin: GuildPlugin = {
  id: 'welcome',
  name: 'Welcome',
  description: 'Greet new members',
  version: '1.0.0',
  author: 'h05',
  status: 'INSTALLED',
  brokenReason: null,
  enabled: true,
  guildStatus: 'ENABLED',
  installedAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  dashboard: { enabled: true, route: 'welcome', label: 'Welcome', icon: 'smile', tabs: [] },
};

const ticketsPlugin: GuildPlugin = {
  id: 'tickets',
  name: 'Tickets',
  description: 'Support tickets',
  version: '1.0.0',
  author: 'h05',
  status: 'INSTALLED',
  brokenReason: null,
  enabled: false,
  guildStatus: 'DISABLED',
  installedAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  dashboard: null,
};

const brokenPlugin: GuildPlugin = {
  id: 'broken',
  name: 'Broken Plugin',
  description: 'Missing dashboard',
  version: '1.0.0',
  author: 'h05',
  status: 'BROKEN',
  brokenReason: 'This plugin says it has a dashboard, but no dashboard interface was included.',
  enabled: false,
  guildStatus: 'DISABLED',
  installedAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  dashboard: { enabled: true, route: '/plugins/broken', label: 'Broken', icon: 'Puzzle', tabs: ['overview'] },
};

const mockPlugins: GuildPlugin[] = [welcomePlugin, ticketsPlugin];

function renderPage(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SelectedGuildProvider>
        <MemoryRouter initialEntries={[`/dashboard/${mockGuildId}/plugins`]}>
          <Routes>
            <Route path="/dashboard/:guildId/plugins" element={element} />
            <Route path="/dashboard/:guildId/plugins/:pluginId" element={<div data-testid="plugin-detail" />} />
            <Route path="/dashboard/:guildId/monitoring/logs" element={<div data-testid="logs-page" />} />
          </Routes>
        </MemoryRouter>
      </SelectedGuildProvider>
    </QueryClientProvider>,
  );
}

describe('GuildPluginsPage', () => {
  beforeEach(() => {
    vi.spyOn(api, 'getGuildPlugins').mockResolvedValue({ data: mockPlugins });
    vi.spyOn(api, 'getGuild').mockResolvedValue({
      id: mockGuildId,
      name: 'Test Guild',
      icon: null,
      memberCount: 100,
      canManage: true,
      isOwner: true,
      hasAdmin: false,
      hasManager: false,
      botConnected: true,
      action: 'manage',
      permissionRole: 'OWNER',
    });
    vi.spyOn(api, 'getGuilds').mockResolvedValue({ data: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the plugin manager with a search input and upload button', async () => {
    renderPage(<GuildPluginsPage />);
    await waitFor(() => expect(screen.getByTestId('plugin-row-welcome')).toBeInTheDocument());
    expect(screen.getByPlaceholderText(/search plugins/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload plugin/i })).toBeInTheDocument();
  });

  it('filters plugins by search term', async () => {
    const user = userEvent.setup();
    renderPage(<GuildPluginsPage />);
    await waitFor(() => expect(screen.getByTestId('plugin-row-welcome')).toBeInTheDocument());
    const search = screen.getByPlaceholderText(/search plugins/i);
    await user.type(search, 'ticket');
    await waitFor(() => expect(screen.queryByTestId('plugin-row-welcome')).not.toBeInTheDocument());
    expect(screen.getByTestId('plugin-row-tickets')).toBeInTheDocument();
  });

  it('opens the upload dialog when the upload button is clicked', async () => {
    const user = userEvent.setup();
    renderPage(<GuildPluginsPage />);
    const uploadButton = await screen.findByRole('button', { name: /upload plugin/i });
    await user.click(uploadButton);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
  });

  it('toggles a plugin and refreshes the list', async () => {
    const user = userEvent.setup();
    const disableMock = vi.spyOn(api, 'disableGuildPlugin').mockResolvedValue(welcomePlugin);
    renderPage(<GuildPluginsPage />);
    const welcomeRow = await screen.findByTestId('plugin-row-welcome');
    const toggle = within(welcomeRow).getByRole('switch', { name: /disable welcome/i });
    await user.click(toggle);
    await waitFor(() => expect(disableMock).toHaveBeenCalledWith(mockGuildId, 'welcome'));
  });

  it('navigates to plugin manage page from the actions menu', async () => {
    const user = userEvent.setup();
    renderPage(<GuildPluginsPage />);
    const welcomeRow = await screen.findByTestId('plugin-row-welcome');
    const menuButton = within(welcomeRow).getByRole('button', { name: /actions for welcome/i });
    await user.click(menuButton);
    const manageButton = await screen.findByRole('menuitem', { name: /manage welcome/i });
    await user.click(manageButton);
    await waitFor(() => expect(screen.getByTestId('plugin-detail')).toBeInTheDocument());
  });

  it('navigates to logs page with plugin filter when view logs is clicked', async () => {
    const user = userEvent.setup();
    renderPage(<GuildPluginsPage />);
    const welcomeRow = await screen.findByTestId('plugin-row-welcome');
    const menuButton = within(welcomeRow).getByRole('button', { name: /actions for welcome/i });
    await user.click(menuButton);
    const logsButton = await screen.findByRole('menuitem', { name: /view logs for welcome/i });
    await user.click(logsButton);
    await waitFor(() => expect(screen.getByTestId('logs-page')).toBeInTheDocument());
  });

  it('opens delete dialog and calls delete API on confirm', async () => {
    const user = userEvent.setup();
    const deleteMock = vi.spyOn(api, 'deleteGuildPlugin').mockResolvedValue(undefined);
    vi.spyOn(api, 'getGuildPlugins')
      .mockResolvedValueOnce({ data: mockPlugins })
      .mockResolvedValue({ data: [ticketsPlugin] });
    renderPage(<GuildPluginsPage />);
    const welcomeRow = await screen.findByTestId('plugin-row-welcome');
    const menuButton = within(welcomeRow).getByRole('button', { name: /actions for welcome/i });
    await user.click(menuButton);
    const deleteMenuItem = await screen.findByRole('menuitem', { name: /delete welcome/i });
    await user.click(deleteMenuItem);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    const confirmButton = within(dialog).getByRole('button', { name: /delete plugin/i });
    await user.click(confirmButton);
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith(mockGuildId, 'welcome', false));
    await waitFor(() => expect(screen.queryByTestId('plugin-row-welcome')).not.toBeInTheDocument());
  });

  it('refresh button is present and clickable', async () => {
    renderPage(<GuildPluginsPage />);
    const refreshButton = await screen.findByRole('button', { name: /refresh plugin list/i });
    expect(refreshButton).toBeInTheDocument();
    expect(refreshButton).not.toBeDisabled();
  });

  it('shows a broken status and disables manage for broken plugins', async () => {
    vi.spyOn(api, 'getGuildPlugins').mockResolvedValue({ data: [brokenPlugin] });
    renderPage(<GuildPluginsPage />);

    const brokenRow = await screen.findByTestId('plugin-row-broken');
    expect(within(brokenRow).getByText('Broken')).toBeInTheDocument();
    const menuButton = within(brokenRow).getByRole('button', { name: /actions for broken plugin/i });
    const user = userEvent.setup();
    await user.click(menuButton);
    expect(await screen.findByRole('menuitem', { name: /needs repair/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /manage broken plugin/i })).not.toBeInTheDocument();
  });
});
