import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { SelectedGuildProvider } from '../state/selected-guild-context.js';
import { CommandPalette } from './command-palette.js';

describe('CommandPalette', () => {
  function renderPalette() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <SelectedGuildProvider>
            <CommandPalette />
          </SelectedGuildProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
  }

  it('opens with Ctrl+K', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard('{Control>}k{/Control}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search pages/i)).toBeInTheDocument();
  });
});
