import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, api } from '../lib/api-client.js';
import { SelectedGuildProvider } from '../state/selected-guild-context.js';
import { PluginUploadDialog } from './plugin-upload-dialog.js';

const guildId = '1111111111111111111';

const uploadedPlugin = {
  id: 'test-plugin',
  name: 'Test Plugin',
  description: 'A test plugin',
  version: '1.0.0',
  author: 'h05',
  status: 'INSTALLED' as const,
  brokenReason: null,
  enabled: false,
  guildStatus: 'DISABLED' as const,
  installedAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  dashboard: { enabled: true, route: 'test-plugin', label: 'Test Plugin', icon: 'smile', tabs: [] },
};

function createFile(name: string, type: string): File {
  return new File(['content'], name, { type });
}

function renderDialog({ open = true, onOpenChange = vi.fn() } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={client}>
      <SelectedGuildProvider>
        <PluginUploadDialog guildId={guildId} open={open} onOpenChange={onOpenChange} />
      </SelectedGuildProvider>
    </QueryClientProvider>,
  );
  const fileInput = document.getElementById('plugin-upload-input') as HTMLInputElement;
  return { ...result, fileInput };
}

describe('PluginUploadDialog', () => {
  let localStorageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorageSpy = vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
    vi.spyOn(api, 'uploadGuildPlugin').mockResolvedValue(uploadedPlugin);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads a plugin and calls onOpenChange on success', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { fileInput } = renderDialog({ onOpenChange });

    await user.upload(fileInput, createFile('test-plugin.vortex', 'application/octet-stream'));

    const installButton = screen.getByRole('button', { name: /install plugin/i });
    await user.click(installButton);

    await waitFor(() => expect(api.uploadGuildPlugin).toHaveBeenCalledWith(guildId, expect.any(File)));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows a friendly error when a third-party plugin is missing its dashboard', async () => {
    const user = userEvent.setup();
    vi.mocked(api.uploadGuildPlugin).mockRejectedValue(
      new ApiError(400, {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        detail: 'Plugin upload failed.',
        instance: '',
        requestId: '',
        error: {
          code: 'PLUGIN_DASHBOARD_MISSING',
          message: 'This plugin package is incomplete. It declares a dashboard but does not include one.',
          details: { pluginId: 'bad-plugin' },
        },
      }),
    );

    const { fileInput } = renderDialog();

    await user.upload(fileInput, createFile('bad-plugin.vortex', 'application/octet-stream'));

    const installButton = screen.getByRole('button', { name: /install plugin/i });
    await user.click(installButton);

    expect(
      await screen.findByText('This plugin package is incomplete. It declares a dashboard but does not include one.'),
    ).toBeInTheDocument();
  });

});
