import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SelectedGuildProvider } from '../state/selected-guild-context.js';
import { ServerSwitcher } from './server-switcher.js';

describe('ServerSwitcher', () => {
  function renderSwitcher() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <SelectedGuildProvider>
            <ServerSwitcher />
          </SelectedGuildProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
  }

  it('filters servers with fuzzy search', async () => {
    const user = userEvent.setup();
    renderSwitcher();

    const trigger = await screen.findByRole('button', { name: /select server/i });
    await user.click(trigger);

    const search = screen.getByPlaceholderText(/search servers/i);
    await user.type(search, 'Tst');

    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });
  });
});
